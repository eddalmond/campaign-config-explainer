import type { Rule } from '../types/campaign';
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
