import type { CampaignConfig, Rule } from '../types/campaign';

/**
 * Cross-reference queries across a campaign. Answers the question
 * "where is this thing used?" for three kinds of identifiers:
 *
 *   - Attribute: an attribute name (with optional level + target)
 *   - Routing code: an internal CommsRouting key
 *   - Cohort: a CohortLabel
 *
 * For each kind, the result is a list of references — each
 * reference says which iteration + which rule index uses the
 * thing in question, with enough context to deep-link back.
 */

export type ReferenceKind = 'attribute' | 'routing' | 'cohort';

export interface RuleReference {
  iterationId: string;
  iterationName: string;
  ruleIndex: number;
  ruleName: string;
  ruleType: Rule['Type'];
  /** For attribute refs: which field uses it (AttributeName or CohortLabel). */
  via: 'AttributeName' | 'CohortLabel' | 'CommsRouting';
  /** The matching context — e.g. for an attribute, the operator + comparator. */
  context: string;
}

export interface ActionReference {
  iterationId: string;
  iterationName: string;
  routingKey: string;
  actionType: string | undefined;
  externalRoutingCode: string | undefined;
  actionDescription: string | undefined;
}

export interface CrossReferenceResult {
  kind: ReferenceKind;
  /** What was searched for. */
  query: string;
  /** Pretty label for the searched thing, e.g. "RSV.LAST_SUCCESSFUL_DATE" or routing code. */
  displayName: string;
  /** All rules that reference the thing. */
  rules: RuleReference[];
  /** For routing code searches: also include the ActionsMapper entry (if any). */
  actions: ActionReference[];
  /** Convenience totals. */
  totalRules: number;
  totalActions: number;
  /** Per-iteration breakdown for the summary. */
  byIteration: { iterationName: string; ruleCount: number; actionCount: number }[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find all references to an attribute. Matches by (level, target, name)
 * if level+target are given, or by name alone if they're not.
 */
export function findAttributeReferences(
  config: CampaignConfig,
  attributeName: string,
  level?: string,
  target?: string,
): CrossReferenceResult {
  const rules: RuleReference[] = [];
  for (const iteration of config.Iterations) {
    for (let i = 0; i < (iteration.IterationRules || []).length; i++) {
      const r = iteration.IterationRules![i];
      if (!matchesAttribute(r, attributeName, level, target)) continue;
      rules.push({
        iterationId: iteration.ID,
        iterationName: iteration.Name || iteration.ID,
        ruleIndex: i,
        ruleName: r.Name,
        ruleType: r.Type,
        via: 'AttributeName',
        context: formatRuleContext(r),
      });
    }
  }
  return summarise({
    kind: 'attribute',
    query: attributeName,
    displayName: formatAttributeDisplay(attributeName, level, target),
    rules,
    actions: [],
    config,
  });
}

/**
 * Find all references to a CommsRouting code. This includes:
 *  - Rules with that code in their CommsRouting field (pipe-delimited, may be multi-code)
 *  - The ActionsMapper entry for that code (if any)
 */
export function findRoutingReferences(
  config: CampaignConfig,
  routingCode: string,
): CrossReferenceResult {
  const rules: RuleReference[] = [];
  const actions: ActionReference[] = [];

  for (const iteration of config.Iterations) {
    // Rules
    for (let i = 0; i < (iteration.IterationRules || []).length; i++) {
      const r = iteration.IterationRules![i];
      const codes = (r.CommsRouting || '').split('|').map(s => s.trim()).filter(Boolean);
      if (codes.includes(routingCode)) {
        rules.push({
          iterationId: iteration.ID,
          iterationName: iteration.Name || iteration.ID,
          ruleIndex: i,
          ruleName: r.Name,
          ruleType: r.Type,
          via: 'CommsRouting',
          context: formatRuleContext(r),
        });
      }
    }
    // ActionsMapper
    const mapper = iteration.ActionsMapper || {};
    if (mapper[routingCode]) {
      const m = mapper[routingCode];
      actions.push({
        iterationId: iteration.ID,
        iterationName: iteration.Name || iteration.ID,
        routingKey: routingCode,
        actionType: m.ActionType,
        externalRoutingCode: m.ExternalRoutingCode,
        actionDescription: m.ActionDescription,
      });
    }
  }

  return summarise({
    kind: 'routing',
    query: routingCode,
    displayName: routingCode,
    rules,
    actions,
    config,
  });
}

/**
 * Find all references to a cohort. This includes:
 *  - Rules that have this cohort in their CohortLabel field (comma-delimited)
 *  - The cohort itself in the iteration's IterationCohorts array
 */
export function findCohortReferences(
  config: CampaignConfig,
  cohortLabel: string,
): CrossReferenceResult {
  const rules: RuleReference[] = [];
  for (const iteration of config.Iterations) {
    // Rules
    for (let i = 0; i < (iteration.IterationRules || []).length; i++) {
      const r = iteration.IterationRules![i];
      const labels = (r.CohortLabel || '').split(',').map(s => s.trim()).filter(Boolean);
      if (labels.includes(cohortLabel)) {
        rules.push({
          iterationId: iteration.ID,
          iterationName: iteration.Name || iteration.ID,
          ruleIndex: i,
          ruleName: r.Name,
          ruleType: r.Type,
          via: 'CohortLabel',
          context: formatRuleContext(r),
        });
      }
    }
  }
  return summarise({
    kind: 'cohort',
    query: cohortLabel,
    displayName: cohortLabel,
    rules,
    actions: [],
    config,
  });
}

/**
 * A "preview" — how many rules would match? Cheap to compute, used to
 * show a "↗ N uses" hint before the user opens the full drawer.
 */
export function countReferences(
  config: CampaignConfig,
  kind: ReferenceKind,
  id: string,
  extra?: { level?: string; target?: string },
): number {
  if (kind === 'attribute') {
    return config.Iterations.reduce((sum, it) =>
      sum + (it.IterationRules || []).filter(r => matchesAttribute(r, id, extra?.level, extra?.target)).length, 0);
  }
  if (kind === 'routing') {
    return config.Iterations.reduce((sum, it) =>
      sum + (it.IterationRules || []).filter(r => {
        const codes = (r.CommsRouting || '').split('|').map(s => s.trim()).filter(Boolean);
        return codes.includes(id);
      }).length, 0);
  }
  // cohort
  return config.Iterations.reduce((sum, it) =>
    sum + (it.IterationRules || []).filter(r => {
      const labels = (r.CohortLabel || '').split(',').map(s => s.trim()).filter(Boolean);
      return labels.includes(id);
    }).length, 0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesAttribute(r: Rule, name: string, level?: string, target?: string): boolean {
  if (r.AttributeName !== name) return false;
  if (level && r.AttributeLevel !== level) return false;
  if (target && r.AttributeTarget !== target) return false;
  return true;
}

function formatAttributeDisplay(name: string, level?: string, target?: string): string {
  if (level === 'TARGET' && target) return `${target}.${name}`;
  if (level) return `${level}.${name}`;
  return name;
}

function formatRuleContext(r: Rule): string {
  const bits: string[] = [`${r.Type} @ priority ${r.Priority}`];
  if (r.AttributeName) bits.push(`${r.AttributeName} ${r.Operator ?? '?'} ${r.Comparator ?? ''}`);
  else if (r.CohortLabel) bits.push(`cohort: ${r.CohortLabel}`);
  return bits.join(' · ');
}

function summarise(input: {
  kind: ReferenceKind;
  query: string;
  displayName: string;
  rules: RuleReference[];
  actions: ActionReference[];
  config: CampaignConfig;
}): CrossReferenceResult {
  // Per-iteration breakdown
  const byIter = new Map<string, { iterationName: string; ruleCount: number; actionCount: number }>();
  // Seed with all iteration names so even iterations with 0 references appear
  for (const it of input.config.Iterations) {
    byIter.set(it.ID, { iterationName: it.Name || it.ID, ruleCount: 0, actionCount: 0 });
  }
  for (const r of input.rules) {
    const entry = byIter.get(r.iterationId);
    if (entry) entry.ruleCount++;
  }
  for (const a of input.actions) {
    const entry = byIter.get(a.iterationId);
    if (entry) entry.actionCount++;
  }
  return {
    kind: input.kind,
    query: input.query,
    displayName: input.displayName,
    rules: input.rules,
    actions: input.actions,
    totalRules: input.rules.length,
    totalActions: input.actions.length,
    byIteration: [...byIter.values()],
  };
}
