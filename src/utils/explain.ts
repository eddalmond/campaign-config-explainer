import type { Iteration, Rule } from '../types/campaign';
import { getAttribute, getOperator, type AttributeDef, type OperatorDef } from '../data/catalog';

/**
 * Render a human-readable explanation of a rule's operator + comparator.
 * Returns the underlying form if the operator isn't recognised.
 */
export function explainOperator(rule: Pick<Rule, 'Operator' | 'Comparator' | 'AttributeName'>): string {
  const op = getOperator(rule.Operator);
  const comparator = rule.Comparator ?? '';
  if (!op) {
    return rule.Operator ? `${rule.Operator} ${rule.Comparator ?? ''}`.trim() : '—';
  }

  // Membership / list operators
  if (op.symbol === 'in') {
    const items = comparator.split(',').map(s => s.trim()).filter(Boolean);
    return items.length > 0
      ? `${rule.AttributeName ?? 'value'} is one of: ${items.join(', ')}`
      : `${op.description} (no values listed)`;
  }
  if (op.symbol === 'MemberOf') {
    const items = comparator.split(',').map(s => s.trim()).filter(Boolean);
    return items.length > 0
      ? `person is a member of cohort: ${items.join(', ')}`
      : `${op.description} (no cohort labels listed)`;
  }

  // Y/D operators on dates — extract N from comparator like "-25" or "-25[[NVL:18000101]]"
  if (op.symbol.startsWith('Y')) {
    const { n, nvl } = parseNvlComparator(comparator);
    const years = n;
    if (years == null) return `${op.symbol} ${comparator}`.trim();
    const nvlSuffix = nvl ? ` (treats null as ${nvl})` : '';
    switch (op.symbol) {
      case 'Y<=': return `date is at least ${-years} years ago${nvlSuffix}`;
      case 'Y<':  return `date is more than ${-years} years ago${nvlSuffix}`;
      case 'Y>=': return `date is at most ${-years} years ago${nvlSuffix}`;
      case 'Y>':  return `date is within the last ${-years} years${nvlSuffix}`;
    }
  }
  if (op.symbol.startsWith('D')) {
    const { n, nvl } = parseNvlComparator(comparator);
    if (n == null) return `${op.symbol} ${comparator}`.trim();
    const nvlSuffix = nvl ? ` (treats null as ${nvl})` : '';
    switch (op.symbol) {
      case 'D<=': return `date is at least ${n} days ago${nvlSuffix}`;
      case 'D<':  return `date is more than ${n} days ago${nvlSuffix}`;
      case 'D>=': return `date is at most ${n} days in the future${nvlSuffix}`;
      case 'D>':  return `date is within the next ${n} days${nvlSuffix}`;
    }
  }

  // Scalar comparators
  return `${rule.AttributeName ?? 'value'} ${op.symbol} ${comparator}`.trim();
}

/**
 * Parse a comparator like "-25" or "-25[[NVL:18000101]]" into its number + NVL fallback.
 */
function parseNvlComparator(comparator: string): { n: number | null; nvl: string | null } {
  if (!comparator) return { n: null, nvl: null };
  const nvlMatch = comparator.match(/\[\[NVL:(\d{8})\]\]/);
  const nvl = nvlMatch ? nvlMatch[1] : null;
  const numPart = comparator.replace(/\[\[NVL:\d{8}\]\]/g, '').trim();
  const n = numPart === '' ? null : Number(numPart);
  return { n: Number.isFinite(n) ? n : null, nvl };
}

/**
 * Look up the catalog entry for a rule's attribute.
 */
export function lookupAttribute(rule: Pick<Rule, 'AttributeName' | 'AttributeLevel' | 'AttributeTarget'>): AttributeDef | undefined {
  return getAttribute(rule.AttributeName, rule.AttributeLevel, rule.AttributeTarget);
}

/**
 * Look up the catalog entry for a rule's operator.
 */
export function lookupOperator(operator: string | undefined): OperatorDef | undefined {
  return getOperator(operator);
}

// ---------------------------------------------------------------------------
// Full-rule natural-language sentences
// ---------------------------------------------------------------------------

/**
 * The "headline" verb-phrase for a rule, e.g.
 *   F → "remove from cohort"
 *   S → "suppress as not actionable"
 *   R → "route the person to"
 *   X → "show not-eligible message"
 *   Y → "show not-actionable message"
 */
function headlineForRuleType(type: Rule['Type'] | undefined): string {
  switch (type) {
    case 'F': return 'remove from the cohort';
    case 'S': return 'suppress as not actionable';
    case 'R': return 'route the person to';
    case 'X': return 'show a not-eligible message via';
    case 'Y': return 'show a not-actionable message via';
    default:  return 'take action';
  }
}

/**
 * Format a single rule as a natural-language sentence. Designed to read
 * top-to-bottom in the rule drawer so the user can verify their intent.
 *
 * Examples:
 *   "F rule at priority 100: remove from the cohort when person's
 *    RSV.LAST_SUCCESSFUL_DATE is at most 25 years ago (treating null as
 *    1800-01-01)."
 *   "R rule at priority 100: route the person to INFO_TEXT when ICB is one
 *    of: QH8, QJG, QWE."
 *   "S rule at priority 200: suppress as not actionable when person's
 *    CARE_HOME_FLAG = Y (and stop further rule evaluation)."
 *   "X rule at priority 2000: show a not-eligible message via (no routing
 *    configured)."
 */
export function explainRule(rule: Pick<Rule,
  'Type' | 'Name' | 'Priority' | 'Description' | 'AttributeLevel' |
  'AttributeName' | 'AttributeTarget' | 'Operator' | 'Comparator' |
  'CohortLabel' | 'RuleStop' | 'CommsRouting'
>): string {
  const parts: string[] = [];
  const typeLabel = rule.Type ? `${rule.Type} rule` : 'Rule';
  const priority = rule.Priority != null ? ` at priority ${rule.Priority}` : '';
  parts.push(`${typeLabel}${priority}:`);
  parts.push(headlineForRuleType(rule.Type));

  // The condition (attribute + operator + comparator)
  const cond = explainCondition(rule);
  if (cond) {
    parts.push(`when ${cond}`);
  }

  // The result (routing code, if any)
  const routing = (rule.CommsRouting || '').split('|').map(s => s.trim()).filter(Boolean);
  if (routing.length > 0) {
    parts.push(`→ ${routing.join(', ')}`);
  } else if (rule.Type === 'R' || rule.Type === 'X' || rule.Type === 'Y') {
    parts.push('(no routing configured)');
  }

  // Cohort scope
  const cohorts = (rule.CohortLabel || '').split(',').map(s => s.trim()).filter(Boolean);
  if (cohorts.length > 0) {
    parts.push(`(applies to cohort${cohorts.length === 1 ? '' : 's'}: ${cohorts.join(', ')})`);
  }

  // RuleStop
  if (rule.RuleStop === true || rule.RuleStop === 'Y') {
    parts.push('(and stop further rule evaluation)');
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * The "when" portion of a rule sentence — i.e. just the condition, no
 * routing/cohort. Useful for the small "Reads as:" line.
 */
export function explainCondition(rule: Pick<Rule,
  'AttributeLevel' | 'AttributeName' | 'AttributeTarget' | 'Operator' | 'Comparator' | 'CohortLabel'
>): string {
  // COHORT-level rules often have a CohortLabel as the condition; if there's
  // no operator, fall back to that.
  if (!rule.Operator) {
    if (rule.CohortLabel) {
      const labels = rule.CohortLabel.split(',').map(s => s.trim()).filter(Boolean);
      return labels.length > 0 ? `person is in cohort: ${labels.join(', ')}` : '';
    }
    return '';
  }

  // Build a friendly attribute reference.
  const attr = rule.AttributeName || 'attribute';
  const targetPrefix = rule.AttributeLevel === 'TARGET' && rule.AttributeTarget
    ? `${rule.AttributeTarget}.`
    : '';
  const attrRef = rule.AttributeLevel === 'PERSON'
    ? `person's ${attr}`
    : rule.AttributeLevel === 'TARGET'
      ? `${targetPrefix}${attr}`
      : rule.AttributeLevel === 'COHORT'
        ? attr
        : attr;

  // For the in / MemberOf operators, the comparator IS the value list —
  // explainOperator produces "ICB is one of: QH8, QJG". Trim the
  // "<AttributeName> is one of:" redundancy and just show "is one of: ..."
  const op = getOperator(rule.Operator);
  if (op?.symbol === 'in') {
    const items = (rule.Comparator ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return `${attrRef} has no value list set`;
    return `${attrRef} is one of: ${items.join(', ')}`;
  }
  if (op?.symbol === 'MemberOf') {
    const items = (rule.Comparator ?? '').split(',').map(s => s.trim()).filter(Boolean);
    if (items.length === 0) return `${attrRef} has no cohort labels set`;
    return `${attrRef} is: ${items.join(', ')}`;
  }

  // For everything else, use explainOperator then strip the redundant
  // "<AttributeName> " prefix that explainOperator prepends.
  const fullExplain = explainOperator(rule);
  if (fullExplain.startsWith(`${attr} `)) {
    return fullExplain.slice(attr.length + 1);
  }
  return fullExplain;
}

// ---------------------------------------------------------------------------
// Iteration-level summary
// ---------------------------------------------------------------------------

/**
 * Render the iteration's rules as 1-2 sentences. Pulls the F/S rules into
 * "filters / suppresses …" and the R/X/Y rules into "routes … to …".
 *
 * Returns an array of sentence strings (usually 1-3) so the caller can
 * render as <p> per sentence if it wants.
 */
export function explainIteration(iteration: Pick<Iteration,
  'IterationRules' | 'IterationCohorts' | 'DefaultCommsRouting' |
  'DefaultNotEligibleRouting' | 'DefaultNotActionableRouting'
>): string[] {
  const out: string[] = [];
  const rules = iteration.IterationRules || [];
  const cohorts = iteration.IterationCohorts || [];
  const cohortSummary = cohorts.length === 0
    ? 'no cohorts are defined'
    : cohorts.length === 1
      ? `1 cohort (${cohorts[0].CohortLabel})`
      : `${cohorts.length} cohorts (${cohorts.map(c => c.CohortLabel).join(', ')})`;

  // Phase 1: F + S rules — the "who is eligible" story
  const fRules = rules.filter(r => r.Type === 'F');
  const sRules = rules.filter(r => r.Type === 'S');
  const eligibilityBits: string[] = [];
  if (fRules.length > 0) {
    eligibilityBits.push(`${summariseRuleList(fRules, 'filter')}`);
  }
  if (sRules.length > 0) {
    eligibilityBits.push(`${summariseRuleList(sRules, 'suppress')}`);
  }
  if (eligibilityBits.length > 0) {
    out.push(`Eligibility (${cohortSummary}): ${joinList(eligibilityBits)}.`);
  } else if (rules.filter(r => r.Type === 'F' || r.Type === 'S').length === 0) {
    out.push(`Eligibility (${cohortSummary}): every person is eligible (no F or S rules defined).`);
  }

  // Phase 2: R / X / Y routing story
  const rRules = rules.filter(r => r.Type === 'R');
  const xRules = rules.filter(r => r.Type === 'X');
  const yRules = rules.filter(r => r.Type === 'Y');
  const routingBits: string[] = [];
  if (rRules.length > 0) {
    routingBits.push(`if actionable, ${summariseRuleList(rRules, 'route')}`);
  } else if (iteration.DefaultCommsRouting) {
    routingBits.push(`if actionable, default to ${iteration.DefaultCommsRouting}`);
  }
  if (xRules.length > 0) {
    routingBits.push(`if not eligible, ${summariseRuleList(xRules, 'route')}`);
  } else if (iteration.DefaultNotEligibleRouting) {
    routingBits.push(`if not eligible, default to ${iteration.DefaultNotEligibleRouting}`);
  }
  if (yRules.length > 0) {
    routingBits.push(`if not actionable, ${summariseRuleList(yRules, 'route')}`);
  } else if (iteration.DefaultNotActionableRouting) {
    routingBits.push(`if not actionable, default to ${iteration.DefaultNotActionableRouting}`);
  }
  if (routingBits.length > 0) {
    out.push(`Routing: ${joinList(routingBits)}.`);
  } else {
    out.push(`Routing: no R/X/Y rules and no defaults configured.`);
  }

  return out;
}

/**
 * Summarise a list of rules of the same type as a single phrase.
 * "filters them out if X" / "suppresses them if Y" / "routes them to Z"
 */
function summariseRuleList(rules: Rule[], verb: 'filter' | 'suppress' | 'route'): string {
  if (rules.length === 0) return '';
  if (rules.length === 1) {
    return `${verb}${verb === 'route' ? 's them to ' : 's them when '}${shortRuleCondition(rules[0])}`;
  }
  // Group by priority (priority groups are the "first match wins" groups)
  const groups = new Map<number, Rule[]>();
  for (const r of rules) {
    const p = r.Priority ?? 0;
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(r);
  }
  const groupDescs = [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([p, grp]) => {
      const conds = grp.map(shortRuleCondition).join(' AND ');
      const routing = grp[0].CommsRouting;
      if (verb === 'route' && routing) {
        return `at priority ${p} (${conds}) → ${routing.split('|').filter(Boolean).join(', ')}`;
      }
      return `at priority ${p} (${conds})`;
    });
  if (verb === 'route') {
    return `${rules.length} rule groups: ${groupDescs.join('; ')}`;
  }
  return `${verb}${verb === 'filter' ? 's' : 'es'} them: ${groupDescs.join('; ')}`;
}

/**
 * Compress a rule's condition to a short phrase for iteration-level
 * summaries. e.g. "RSV.LAST_SUCCESSFUL_DATE is at most 25 years ago"
 */
function shortRuleCondition(rule: Rule): string {
  const cond = explainCondition(rule);
  return cond || (rule.Name ? `"${rule.Name}"` : 'unspecified condition');
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
