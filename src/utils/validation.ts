import type { Iteration, Rule, ActionMapping } from '../types/campaign';
import { getAttribute, getOperator, KNOWN_ACTION_TYPES } from '../data/catalog';

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: Severity;
  code: string;
  message: string;
  /** Optional rule index for deep-linking later. */
  ruleIndex?: number;
  /** Optional cohort label referenced. */
  cohortLabel?: string;
  /** Optional routing code referenced. */
  routingCode?: string;
}

interface RuleContext {
  rule: Rule;
  index: number;
  cohortLabels: Set<string>;
  actionsMapper: Record<string, ActionMapping>;
  actionTypes: Set<string>;
  ruleStopAllowed: boolean;
}

function makeCtx(iteration: Iteration): RuleContext {
  const cohortLabels = new Set((iteration.IterationCohorts || []).map(c => c.CohortLabel));
  const actionsMapper = iteration.ActionsMapper || {};
  const actionTypes = new Set(
    Object.values(actionsMapper).map(a => a.ActionType).filter((t): t is string => Boolean(t)),
  );
  return {
    rule: undefined as unknown as Rule, // filled per call
    index: -1,
    cohortLabels,
    actionsMapper,
    actionTypes,
    ruleStopAllowed: false,
  };
}

function validateRule(rule: Rule, index: number, ctx: RuleContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // RuleStop is only meaningful on S-rules; warn if used elsewhere
  const hasRuleStop = rule.RuleStop === true || rule.RuleStop === 'Y';
  if (hasRuleStop && rule.Type !== 'S') {
    issues.push({
      severity: 'warning',
      code: 'RULE_STOP_ON_NON_S',
      message: `RuleStop is set on a ${rule.Type} rule. RuleStop is only meaningful for Suppression (S) rules.`,
      ruleIndex: index,
    });
  }

  // Filter rules should not set CommsRouting; R/X/Y rules should
  if (rule.Type === 'F' && rule.CommsRouting) {
    issues.push({
      severity: 'warning',
      code: 'F_RULE_WITH_ROUTING',
      message: `Filter (F) rule has CommsRouting set. Filter rules should not route — they only affect eligibility.`,
      ruleIndex: index,
    });
  }
  if ((rule.Type === 'R' || rule.Type === 'X' || rule.Type === 'Y') && !rule.CommsRouting) {
    issues.push({
      severity: 'error',
      code: 'ACTION_RULE_WITHOUT_ROUTING',
      message: `${rule.Type} rule "${rule.Name}" has no CommsRouting. It will not produce an action.`,
      ruleIndex: index,
    });
  }

  // Attribute known?
  if (rule.AttributeName) {
    const attr = getAttribute(rule.AttributeName, rule.AttributeLevel, rule.AttributeTarget);
    if (!attr) {
      issues.push({
        severity: 'error',
        code: 'UNKNOWN_ATTRIBUTE',
        message: `Attribute "${rule.AttributeName}"${rule.AttributeLevel ? ` (${rule.AttributeLevel})` : ''} is not in the catalog.`,
        ruleIndex: index,
      });
    } else {
      // Operator valid for this attribute's value type?
      if (rule.Operator) {
        const op = getOperator(rule.Operator);
        if (!op) {
          issues.push({
            severity: 'error',
            code: 'UNKNOWN_OPERATOR',
            message: `Operator "${rule.Operator}" is not recognised.`,
            ruleIndex: index,
          });
        } else if (!op.appliesTo.includes(attr.type)) {
          issues.push({
            severity: 'warning',
            code: 'OPERATOR_TYPE_MISMATCH',
            message: `Operator "${rule.Operator}" is not typically valid for ${attr.type} values (${rule.AttributeName}).`,
            ruleIndex: index,
          });
        }
      }

      // COHORT-level rule must use COHORT_LABEL attribute
      if (rule.AttributeLevel === 'COHORT' && rule.AttributeName !== 'COHORT_LABEL') {
        issues.push({
          severity: 'warning',
          code: 'COHORT_LEVEL_WRONG_ATTRIBUTE',
          message: `AttributeLevel = COHORT normally uses AttributeName = COHORT_LABEL (with Operator: MemberOf). Got "${rule.AttributeName}".`,
          ruleIndex: index,
        });
      }
    }
  }

  // CohortLabel must reference a defined cohort
  if (rule.CohortLabel) {
    const labels = rule.CohortLabel.split(',').map(s => s.trim()).filter(Boolean);
    for (const label of labels) {
      if (!ctx.cohortLabels.has(label)) {
        issues.push({
          severity: 'error',
          code: 'UNKNOWN_COHORT',
          message: `CohortLabel "${label}" is not defined in IterationCohorts.`,
          ruleIndex: index,
          cohortLabel: label,
        });
      }
    }
  }

  // CommsRouting codes must exist in ActionsMapper
  if (rule.CommsRouting) {
    const codes = rule.CommsRouting.split('|').map(s => s.trim()).filter(Boolean);
    for (const code of codes) {
      if (!(code in ctx.actionsMapper)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_ACTION_MAPPING',
          message: `CommsRouting code "${code}" has no entry in ActionsMapper.`,
          ruleIndex: index,
          routingCode: code,
        });
      }
    }
  }

  return issues;
}

function findDuplicateRules(rules: Rule[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seen = new Map<string, number[]>();

  for (let i = 0; i < rules.length; i++) {
    const r = rules[i];
    const key = [
      r.Type,
      r.Priority,
      r.AttributeLevel ?? '',
      r.AttributeTarget ?? '',
      r.AttributeName ?? '',
      r.Operator ?? '',
      r.Comparator ?? '',
      r.CohortLabel ?? '',
    ].join('|');
    const list = seen.get(key) ?? [];
    list.push(i);
    seen.set(key, list);
  }

  for (const [key, indices] of seen) {
    if (indices.length > 1) {
      // Severity is warning because priority-shared groups are sometimes intentional
      // (e.g. multiple constraints within the same priority bucket).
      const [type, priority] = key.split('|');
      issues.push({
        severity: 'warning',
        code: 'DUPLICATE_RULE',
        message: `${indices.length} identical ${type} rules at priority ${priority} (indices ${indices.join(', ')}). Check this is intentional — they will fire together.`,
        ruleIndex: indices[0],
      });
    }
  }

  return issues;
}

function findRoutingCoverage(
  rules: Rule[],
  defaultRouting: string | undefined,
  type: 'R' | 'X' | 'Y',
): ValidationIssue[] {
  // If there are no rules of this type and no default routing, the iteration
  // will fall through silently. We flag it as a warning, not an error.
  const matching = rules.filter(r => r.Type === type);
  if (matching.length === 0 && !defaultRouting) {
    return [{
      severity: 'warning',
      code: 'NO_ROUTING_COVERAGE',
      message: `No ${type} rules and no default routing. The iteration has no ${type === 'R' ? 'actionable' : type === 'X' ? 'not-eligible' : 'not-actionable'} path.`,
    }];
  }
  return [];
}

function findActionTypeIssues(mapper: Record<string, ActionMapping>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [key, action] of Object.entries(mapper)) {
    if (action.ActionType && !KNOWN_ACTION_TYPES.has(action.ActionType)) {
      issues.push({
        severity: 'warning',
        code: 'UNKNOWN_ACTION_TYPE',
        message: `ActionsMapper["${key}"].ActionType "${action.ActionType}" is not a known action type.`,
        routingCode: key,
      });
    }
    if (action.UrlLink && !isLikelyUrl(action.UrlLink)) {
      issues.push({
        severity: 'warning',
        code: 'SUSPICIOUS_URL',
        message: `ActionsMapper["${key}"].UrlLink "${action.UrlLink}" doesn't look like a valid URL.`,
        routingCode: key,
      });
    }
  }
  return issues;
}

function isLikelyUrl(s: string): boolean {
  return /^(https?:\/\/|\/|mailto:|[a-z]+:\/\/)/i.test(s);
}

export function validateIteration(iteration: Iteration): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = iteration.IterationRules || [];

  for (let i = 0; i < rules.length; i++) {
    const ctx = makeCtx(iteration);
    ctx.rule = rules[i];
    ctx.index = i;
    issues.push(...validateRule(rules[i], i, ctx));
  }

  issues.push(...findDuplicateRules(rules));
  issues.push(...findRoutingCoverage(rules, iteration.DefaultCommsRouting, 'R'));
  issues.push(...findRoutingCoverage(rules, iteration.DefaultNotEligibleRouting, 'X'));
  issues.push(...findRoutingCoverage(rules, iteration.DefaultNotActionableRouting, 'Y'));
  issues.push(...findActionTypeIssues(iteration.ActionsMapper || {}));

  // Stable ordering: errors first, then warnings, then info; within severity
  // by rule index ascending.
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => {
    const s = order[a.severity] - order[b.severity];
    if (s !== 0) return s;
    return (a.ruleIndex ?? -1) - (b.ruleIndex ?? -1);
  });

  return issues;
}

export function summarise(issues: ValidationIssue[]): { errors: number; warnings: number; infos: number } {
  let errors = 0, warnings = 0, infos = 0;
  for (const i of issues) {
    if (i.severity === 'error') errors++;
    else if (i.severity === 'warning') warnings++;
    else infos++;
  }
  return { errors, warnings, infos };
}
