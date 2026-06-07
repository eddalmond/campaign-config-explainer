import type { RuleType } from '../types/campaign';

export interface RuleFilterState {
  /** When non-empty, only rules of these types are shown. */
  types: RuleType[];
  /** When set, only rules at priorities in this range are shown. */
  priorityMin?: number;
  priorityMax?: number;
  /** Free-text query, matched against Name, AttributeName, Operator, Comparator, CommsRouting. */
  query?: string;
}

/** Pure helper: apply a filter to a list of rules. */
export function applyRuleFilter<T extends { Type: RuleType; Priority: number; Name: string; AttributeName?: string; Operator?: string; Comparator?: string; CommsRouting?: string }>(
  rules: T[],
  filter: RuleFilterState,
): T[] {
  return rules.filter(r => {
    if (filter.types.length > 0 && !filter.types.includes(r.Type)) return false;
    if (filter.priorityMin != null && r.Priority < filter.priorityMin) return false;
    if (filter.priorityMax != null && r.Priority > filter.priorityMax) return false;
    if (filter.query) {
      const q = filter.query.toLowerCase();
      const haystack = [r.Name, r.AttributeName, r.Operator, r.Comparator, r.CommsRouting]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
