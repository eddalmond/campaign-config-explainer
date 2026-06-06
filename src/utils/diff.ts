import type { Iteration, Rule, Cohort, ActionMapping } from '../types/campaign';

/**
 * Structured diff between two iterations. Designed for the "compare two
 * iterations side-by-side" workflow the user does when authoring the
 * next version of a campaign.
 *
 * Matching strategy:
 *   - Cohorts: by CohortLabel. If a cohort in A has no match in B, and
 *     there's a cohort in B with the same Priority + CohortGroup + similar
 *     Name, treat it as a rename (heuristic).
 *   - Rules: by (Type, Name) as a primary key. If no match, fall back to
 *     a weaker heuristic on (Type, Priority, AttributeName) for renames.
 *     If still no match, it's added/removed.
 *   - ActionsMapper: by key.
 *
 * The output is a flat list of "changes" with enough context for the UI
 * to render them in any order.
 */

export type ChangeKind = 'added' | 'removed' | 'modified' | 'renamed';

export interface FieldChange {
  field: string;
  /** Stringified "before" value, or null if added. */
  before: string | null;
  /** Stringified "after" value, or null if removed. */
  after: string | null;
}

export interface DiffChange {
  kind: ChangeKind;
  section: 'metadata' | 'cohort' | 'rule' | 'action' | 'defaults' | 'status-text';
  /** Identifier for the thing that changed (rule name, cohort label, action key, etc.). */
  id: string;
  /** For renames: the other side's identifier. */
  renamedTo?: string;
  renamedFrom?: string;
  /** For modifications: the per-field changes. */
  changes?: FieldChange[];
  /** Human-readable summary. */
  summary: string;
}

export interface IterationDiff {
  /** The "before" iteration name. */
  fromName: string;
  /** The "after" iteration name. */
  toName: string;
  changes: DiffChange[];
  /** Convenience counters. */
  summary: {
    added: number;
    removed: number;
    modified: number;
    renamed: number;
  };
}

/** Fields of an Iteration that we care about for diff purposes. */
const ITERATION_META_FIELDS: (keyof Iteration)[] = [
  'Name', 'IterationDate', 'Type', 'CommsType', 'StatusText',
  'DefaultCommsRouting', 'DefaultNotEligibleRouting', 'DefaultNotActionableRouting',
  'Version', 'IterationNumber', 'ApprovalMinimum', 'ApprovalMaximum',
];

const COHORT_FIELDS: (keyof Cohort)[] = [
  'Priority', 'CohortLabel', 'CohortGroup', 'Virtual',
  'PositiveDescription', 'NegativeDescription',
];

/** Fields of a Rule we consider when computing "modified". Excludes Description (long text). */
const RULE_FIELDS: (keyof Rule)[] = [
  'Type', 'Priority', 'Name', 'AttributeLevel', 'AttributeTarget',
  'AttributeName', 'Operator', 'Comparator', 'CohortLabel',
  'RuleStop', 'CommsRouting',
];

const ACTION_FIELDS: (keyof ActionMapping)[] = [
  'ExternalRoutingCode', 'ActionType', 'ActionDescription', 'UrlLink', 'UrlLabel',
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function diffIterations(a: Iteration, b: Iteration): IterationDiff {
  const changes: DiffChange[] = [];

  // 1. Iteration-level metadata
  for (const f of ITERATION_META_FIELDS) {
    const av = a[f];
    const bv = b[f];
    if (!deepEqual(av, bv)) {
      changes.push({
        kind: 'modified',
        section: f === 'StatusText' ? 'status-text' : (f.startsWith('Default') ? 'defaults' : 'metadata'),
        id: String(f),
        changes: [{ field: String(f), before: stringify(av), after: stringify(bv) }],
        summary: `${f}: ${stringify(av) || '—'} → ${stringify(bv) || '—'}`,
      });
    }
  }

  // 2. Cohorts
  changes.push(...diffCohorts(a.IterationCohorts || [], b.IterationCohorts || []));

  // 3. Rules — the meatiest part
  changes.push(...diffRules(a.IterationRules || [], b.IterationRules || []));

  // 4. ActionsMapper
  changes.push(...diffActions(a.ActionsMapper || {}, b.ActionsMapper || {}));

  // Tally
  const summary = { added: 0, removed: 0, modified: 0, renamed: 0 };
  for (const c of changes) summary[c.kind]++;

  return { fromName: a.Name || a.ID, toName: b.Name || b.ID, changes, summary };
}

// ---------------------------------------------------------------------------
// Section diffs
// ---------------------------------------------------------------------------

function diffCohorts(a: Cohort[], b: Cohort[]): DiffChange[] {
  const out: DiffChange[] = [];
  const bByLabel = new Map(b.map(c => [c.CohortLabel, c]));

  // First pass: exact matches and pure adds/removes
  const matched = new Set<string>();
  for (const ca of a) {
    const cb = bByLabel.get(ca.CohortLabel);
    if (cb) {
      matched.add(ca.CohortLabel);
      const fieldChanges = fieldsChanged(ca, cb, COHORT_FIELDS);
      if (fieldChanges.length > 0) {
        out.push({
          kind: 'modified',
          section: 'cohort',
          id: ca.CohortLabel,
          changes: fieldChanges,
          summary: `Cohort ${ca.CohortLabel}: ${fieldChanges.length} field${fieldChanges.length === 1 ? '' : 's'} changed`,
        });
      }
    }
  }
  for (const ca of a) {
    if (matched.has(ca.CohortLabel)) continue;
    // Look for a rename match: same Priority + CohortGroup, different label
    const rename = b.find(cb =>
      !matched.has(cb.CohortLabel) &&
      cb.Priority === ca.Priority &&
      cb.CohortGroup === ca.CohortGroup &&
      cb.CohortLabel !== ca.CohortLabel
    );
    if (rename) {
      matched.add(rename.CohortLabel);
      out.push({
        kind: 'renamed',
        section: 'cohort',
        id: ca.CohortLabel,
        renamedTo: rename.CohortLabel,
        summary: `Cohort renamed: ${ca.CohortLabel} → ${rename.CohortLabel} (same priority + group)`,
      });
    } else {
      out.push({
        kind: 'removed',
        section: 'cohort',
        id: ca.CohortLabel,
        summary: `Cohort removed: ${ca.CohortLabel}`,
      });
    }
  }
  for (const cb of b) {
    if (matched.has(cb.CohortLabel)) continue;
    out.push({
      kind: 'added',
      section: 'cohort',
      id: cb.CohortLabel,
      summary: `Cohort added: ${cb.CohortLabel}`,
    });
  }
  return out;
}

function diffRules(a: Rule[], b: Rule[]): DiffChange[] {
  const out: DiffChange[] = [];
  // Primary key: (Type, Name). Name is the user-given grouping key, so
  // this is the strongest signal that two rules are "the same".
  const aKey = (r: Rule) => `${r.Type}|${r.Name}`;
  const bKey = (r: Rule) => `${r.Type}|${r.Name}`;
  const aByKey = new Map<string, Rule[]>();
  const bByKey = new Map<string, Rule[]>();
  for (const r of a) {
    const list = aByKey.get(aKey(r)) ?? [];
    list.push(r);
    aByKey.set(aKey(r), list);
  }
  for (const r of b) {
    const list = bByKey.get(bKey(r)) ?? [];
    list.push(r);
    bByKey.set(bKey(r), list);
  }

  // Track which rules have been matched on each side (by reference)
  const aMatched = new WeakSet<Rule>();
  const bMatched = new WeakSet<Rule>();

  // First pass: exact (Type, Name) matches
  for (const [key, aList] of aByKey) {
    const bList = bByKey.get(key);
    if (!bList || bList.length === 0) continue;
    // Pair them up one-to-one
    const len = Math.min(aList.length, bList.length);
    for (let i = 0; i < len; i++) {
      aMatched.add(aList[i]);
      bMatched.add(bList[i]);
      const fieldChanges = fieldsChanged(aList[i], bList[i], RULE_FIELDS);
      if (fieldChanges.length > 0) {
        out.push({
          kind: 'modified',
          section: 'rule',
          id: aList[i].Name,
          changes: fieldChanges,
          summary: `Rule "${aList[i].Name}" (${aList[i].Type}): ${fieldChanges.length} field${fieldChanges.length === 1 ? '' : 's'} changed`,
        });
      }
    }
  }

  // Second pass: unmatched rules in A — look for renames (same Type, same Priority, same AttributeName)
  for (const ra of a) {
    if (aMatched.has(ra)) continue;
    const rename = b.find(rb =>
      !bMatched.has(rb) &&
      rb.Type === ra.Type &&
      rb.Priority === ra.Priority &&
      rb.AttributeName === ra.AttributeName &&
      rb.Name !== ra.Name
    );
    if (rename) {
      aMatched.add(ra);
      bMatched.add(rename);
      out.push({
        kind: 'renamed',
        section: 'rule',
        id: ra.Name,
        renamedTo: rename.Name,
        summary: `Rule renamed: "${ra.Name}" (${ra.Type} at priority ${ra.Priority}) → "${rename.Name}"`,
      });
    } else {
      out.push({
        kind: 'removed',
        section: 'rule',
        id: ra.Name,
        summary: `Rule removed: "${ra.Name}" (${ra.Type} at priority ${ra.Priority})`,
      });
    }
  }

  // Third pass: unmatched rules in B
  for (const rb of b) {
    if (bMatched.has(rb)) continue;
    out.push({
      kind: 'added',
      section: 'rule',
      id: rb.Name,
      summary: `Rule added: "${rb.Name}" (${rb.Type} at priority ${rb.Priority})`,
    });
  }

  return out;
}

function diffActions(a: Record<string, ActionMapping>, b: Record<string, ActionMapping>): DiffChange[] {
  const out: DiffChange[] = [];
  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));

  for (const k of aKeys) {
    if (!bKeys.has(k)) {
      out.push({
        kind: 'removed',
        section: 'action',
        id: k,
        summary: `Action removed: ${k}`,
      });
    } else {
      const fieldChanges = fieldsChanged(a[k], b[k], ACTION_FIELDS);
      if (fieldChanges.length > 0) {
        out.push({
          kind: 'modified',
          section: 'action',
          id: k,
          changes: fieldChanges,
          summary: `Action ${k}: ${fieldChanges.length} field${fieldChanges.length === 1 ? '' : 's'} changed`,
        });
      }
    }
  }
  for (const k of bKeys) {
    if (!aKeys.has(k)) {
      out.push({
        kind: 'added',
        section: 'action',
        id: k,
        summary: `Action added: ${k}`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a list of field changes between two records. */
function fieldsChanged<T>(
  a: T,
  b: T,
  fields: (keyof T)[],
): FieldChange[] {
  const out: FieldChange[] = [];
  for (const f of fields) {
    const av = a[f];
    const bv = b[f];
    if (!deepEqual(av, bv)) {
      out.push({ field: String(f), before: stringify(av), after: stringify(bv) });
    }
  }
  return out;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}
