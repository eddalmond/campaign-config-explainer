import type { Iteration, Rule, ActionMapping } from '../types/campaign';
import { getAttribute, getOperator, KNOWN_ACTION_TYPES } from '../data/catalog';
import { findTemplateTokens } from './templates';

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

  // S rules usually want RuleStop=Y — info if missing
  if (rule.Type === 'S' && !hasRuleStop) {
    issues.push({
      severity: 'info',
      code: 'S_RULE_WITHOUT_RULE_STOP',
      message: `S rule "${rule.Name}" has no RuleStop. Most S rules want RuleStop = "Y" to short-circuit lower-priority S rules on match.`,
      ruleIndex: index,
    });
  }

  // Recommended priority range per rule type (from the business guide)
  const priorityRange: Record<Rule['Type'], [number, number]> = {
    F: [100, 499],
    S: [500, 999],
    R: [1000, 1999],
    X: [2000, 2999],
    Y: [3000, 3999],
  };
  if (rule.Priority !== undefined) {
    const [lo, hi] = priorityRange[rule.Type];
    if (rule.Priority < lo || rule.Priority > hi) {
      issues.push({
        severity: 'info',
        code: 'PRIORITY_OUT_OF_RANGE',
        message: `${rule.Type} rule "${rule.Name}" has priority ${rule.Priority}. The recommended range is ${lo}–${hi}.`,
        ruleIndex: index,
      });
    }
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

      // Date-type attribute: comparator should look like a date (8 digits) or
      // an in/not_in list of dates, or NVL syntax, or one of the date operators
      if (attr.type === 'date' && rule.Operator && rule.Comparator !== undefined) {
        const op = rule.Operator;
        // Y*/D*/W* operators take a relative integer (e.g. -25 or 0) — skip
        // is_null, is_not_null, is_empty, is_not_empty — skip
        if (
          !op.startsWith('Y') && !op.startsWith('D') && !op.startsWith('W') &&
          !op.startsWith('is_')
        ) {
          // For in / not_in, validate every comma-separated token
          const tokens = rule.Comparator.split(',').map(s => s.trim());
          for (const t of tokens) {
            if (t === '') continue;
            // Allow [[NVL:YYYYMMDD]] tail-anchored on Y/D/W — but the user
            // isn't using Y/D/W here, so it shouldn't appear.
            if (t.startsWith('[[NVL:')) continue;
            if (!/^\d{8}$/.test(t) && op !== 'between' && op !== 'not_between' && !/^\d/.test(t)) {
              issues.push({
                severity: 'warning',
                code: 'MALFORMED_DATE',
                message: `Comparator "${t}" for date attribute ${rule.AttributeName} should be 8 digits (YYYYMMDD).`,
                ruleIndex: index,
              });
              break; // one warning per rule is enough
            }
          }
        }
      }
    }
  }

  // Comparator whitespace for list/membership operators: "A, B" is broken
  if (rule.Comparator) {
    const listOps = new Set(['in', 'not_in', 'MemberOf', 'NotMemberOf', 'between', 'not_between']);
    if (rule.Operator && listOps.has(rule.Operator) && /\s,|,\s|\s,\s/.test(rule.Comparator)) {
      issues.push({
        severity: 'error',
        code: 'COMPARATOR_LIST_WHITESPACE',
        message: `${rule.Operator} comparator "${rule.Comparator}" has spaces around commas. Use "A,B" not "A, B".`,
        ruleIndex: index,
      });
    }
  }

  // COHORT variable in description — only Person and Target are supported
  if (rule.Description) {
    const tokens = findTemplateTokens(rule.Description);
    for (const t of tokens) {
      if (t.kind === 'substitution' && /^\s*COHORT\b/i.test(t.label)) {
        issues.push({
          severity: 'error',
          code: 'COHORT_VARIABLE_IN_DESCRIPTION',
          message: `Description uses a [[COHORT.x]] substitution. Only Person and Target variables are supported.`,
          ruleIndex: index,
        });
        break;
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
    // Same whitespace check on CohortLabel
    if (/\s,|,\s|\s,\s/.test(rule.CohortLabel)) {
      issues.push({
        severity: 'error',
        code: 'COMPARATOR_LIST_WHITESPACE',
        message: `CohortLabel "${rule.CohortLabel}" has spaces around commas.`,
        ruleIndex: index,
      });
    }
  }

  // CommsRouting codes must exist in ActionsMapper, and no whitespace
  if (rule.CommsRouting) {
    if (/\s\|\s|\|\s|\s\|/.test(rule.CommsRouting)) {
      issues.push({
        severity: 'error',
        code: 'COMMS_ROUTING_WHITESPACE',
        message: `CommsRouting "${rule.CommsRouting}" has spaces around pipes. Use "A|B" not "A | B".`,
        ruleIndex: index,
      });
    }
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

/**
 * Iteration-level (not per-rule) checks. Run once per iteration.
 * Includes cohort priority uniqueness, iteration date range, and the
 * same-priority cohort-restriction invariant.
 */
function findIterationLevelIssues(iteration: Iteration): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const cohorts = iteration.IterationCohorts || [];
  const rules = iteration.IterationRules || [];

  // B1: cohorts in the same iteration must not share a priority
  const seen = new Map<number, string[]>();
  for (const c of cohorts) {
    const p = c.Priority;
    const list = seen.get(p) ?? [];
    list.push(c.CohortLabel);
    seen.set(p, list);
  }
  for (const [p, labels] of seen) {
    if (labels.length > 1) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_COHORT_PRIORITY',
        message: `${labels.length} cohorts share priority ${p}: ${labels.join(', ')}. Cohorts in the same iteration must have unique priorities.`,
        cohortLabel: labels[0],
      });
    }
  }

  // C7: IterationDate must fall within campaign StartDate/EndDate
  // (We don't have the campaign in this validator signature, so we just
  // sanity-check the format here; the campaign-level call wraps this.)
  if (iteration.IterationDate) {
    const d = iteration.IterationDate;
    // Allow template tokens
    if (!/^<<[^>]+>>$/.test(d) && !/^\d{8}$/.test(d)) {
      issues.push({
        severity: 'warning',
        code: 'MALFORMED_DATE',
        message: `IterationDate "${d}" should be a YYYYMMDD string or a deploy-time template token like <<DATE_DAY_-100>>.`,
      });
    }
  }

  // A2: cross-type priority collision — a single priority is used by rules
  // of different types. The guide recommends keeping types on different
  // priorities so the flow is unambiguous.
  const byPriority = new Map<number, Set<Rule['Type']>>();
  for (const r of rules) {
    const set = byPriority.get(r.Priority) ?? new Set();
    set.add(r.Type);
    byPriority.set(r.Priority, set);
  }
  for (const [p, types] of byPriority) {
    if (types.size > 1) {
      const typeList = [...types].sort().join(', ');
      issues.push({
        severity: 'warning',
        code: 'CROSS_TYPE_PRIORITY_COLLISION',
        message: `Priority ${p} is shared across rule types ${typeList}. Best practice is to use a different priority per type.`,
      });
    }
  }

  // A4: rules at the same priority must share the same CohortLabel setting
  // (all empty, or all the same set of labels)
  const groupByPriority = new Map<number, Rule[]>();
  for (const r of rules) {
    const list = groupByPriority.get(r.Priority) ?? [];
    list.push(r);
    groupByPriority.set(r.Priority, list);
  }
  for (const [p, group] of groupByPriority) {
    if (group.length < 2) continue;
    const labelsInGroup = new Set(group.map(r => (r.CohortLabel || '').trim()).map(s => s || '<none>'));
    if (labelsInGroup.size > 1) {
      issues.push({
        severity: 'error',
        code: 'PRIORITY_GROUP_COHORT_MISMATCH',
        message: `Rules at priority ${p} have inconsistent CohortLabel settings: ${[...labelsInGroup].join(' vs ')}. Same-priority rules must have the same CohortLabel.`,
      });
    }
  }

  return issues;
}

/**
 * Cross-iteration check: a config may have multiple iterations. The full
 * validator signature takes an Iteration, but the wrapper at the call site
 * can additionally pass the parent campaign for context. We accept it
 * optionally and run iteration-date-in-campaign-range when present.
 */
function findCampaignLevelIssues(iteration: Iteration, campaign: { StartDate?: string; EndDate?: string } | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!campaign || !iteration.IterationDate) return issues;
  const d = iteration.IterationDate;
  if (/^<<[^>]+>>$/.test(d)) return issues; // template token — skip
  if (!/^\d{8}$/.test(d)) return issues;     // already malformed; reported elsewhere

  if (campaign.StartDate && /^\d{8}$/.test(campaign.StartDate) && d < campaign.StartDate) {
    issues.push({
      severity: 'error',
      code: 'ITERATION_DATE_OUT_OF_RANGE',
      message: `IterationDate ${d} is before campaign StartDate ${campaign.StartDate}.`,
    });
  }
  if (campaign.EndDate && /^\d{8}$/.test(campaign.EndDate) && d > campaign.EndDate) {
    issues.push({
      severity: 'error',
      code: 'ITERATION_DATE_OUT_OF_RANGE',
      message: `IterationDate ${d} is after campaign EndDate ${campaign.EndDate}.`,
    });
  }
  return issues;
}

function isLikelyUrl(s: string): boolean {
  return /^(https?:\/\/|\/|mailto:|[a-z]+:\/\/)/i.test(s);
}

export function validateIteration(iteration: Iteration, campaign?: { StartDate?: string; EndDate?: string }): ValidationIssue[] {
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
  issues.push(...findIterationLevelIssues(iteration));
  issues.push(...findCampaignLevelIssues(iteration, campaign));

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
