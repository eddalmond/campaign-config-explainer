import type { AttributeLevel, RuleType } from '../types/campaign';

/**
 * Attribute & operator catalog for the campaign config.
 *
 * This is the v1 hand-maintained source of truth for what attributes exist,
 * what types they have, and which operators are valid against them.
 *
 * Extend it as new attributes appear in real configs. The validation panel
 * and any future autocomplete/dropdowns consume this file.
 *
 * To migrate to an API-driven source later, replace `getAttribute` and
 * `getOperatorsFor` with async fetchers — call sites should not change.
 */

export type ValueType = 'date' | 'flag' | 'code' | 'cohort' | 'text' | 'number';

export interface AttributeDef {
  name: string;
  level: AttributeLevel;
  type: ValueType;
  /** Required when level === 'TARGET' (e.g. 'RSV'). */
  target?: string;
  description: string;
  /** For 'code' types, an optional set of known values. Not exhaustive — leave empty for freeform codes. */
  validValues?: string[];
}

export interface OperatorDef {
  symbol: string;
  /** Which attribute value types this operator is valid for. */
  appliesTo: ValueType[];
  /** Human-readable explanation used in the rule tables and validation. */
  description: string;
  /** Short form for the "explains the comparator" rendering. */
  example?: string;
  /**
   * For comparison operators that take a single scalar comparator, this
   * describes what the comparator means. For list/membership operators it's null.
   */
  comparatorHint?: string | null;
}

// ---------------------------------------------------------------------------
// Attribute catalog
// ---------------------------------------------------------------------------

/**
 * The set of valid target (vaccine / condition) codes. Used to validate
 * rule.AttributeTarget when level === 'TARGET'. The dropdown in RuleEditor
 * reads from this too.
 *
 * The DDB lineage doc (docs/domain-conventions.md) lists these as the
 * targets that vims.elid_target_conditions_attributes is built for.
 */
export const KNOWN_TARGETS: readonly string[] = [
  'MENB', 'HPV', 'PERTUSSIS', 'SHINGLES', 'PNEUMOCCOCAL',
  'MENACWY', 'TDIPV', '3IN1', '4IN1', '6IN1',
  'ROTAVIRUS', 'HIBMENC', 'HEPB', 'FLU', 'COVID',
] as const;

/**
 * The set of valid campaign types. Per the guide, two are observed:
 * V (vaccination) and S (screening). We use this for the campaign Type
 * dropdown and for validation.
 */
export const KNOWN_CAMPAIGN_TYPES: readonly string[] = ['V', 'S'] as const;

export const ATTRIBUTES: AttributeDef[] = [
  // ---- PERSON level ----
  {
    name: 'DATE_OF_BIRTH',
    level: 'PERSON',
    type: 'date',
    description: 'PDS date of birth. Used to compute age at the time of execution.',
  },
  {
    name: 'CARE_HOME_FLAG',
    level: 'PERSON',
    type: 'flag',
    description: 'Y if the person lives in a care home, N otherwise.',
    validValues: ['Y', 'N'],
  },
  {
    name: 'DE_FLAG',
    level: 'PERSON',
    type: 'flag',
    description: 'Detained Estate flag — Y if the person is in a detained setting.',
    validValues: ['Y', 'N'],
  },
  {
    name: '13Q_FLAG',
    level: 'PERSON',
    type: 'flag',
    description: 'Section 13Q mental health setting flag.',
    validValues: ['Y', 'N'],
  },
  {
    name: 'ICB',
    level: 'PERSON',
    type: 'code',
    description: 'NHS Integrated Care Board code.',
  },
  {
    name: 'LOCAL_AUTHORITY',
    level: 'PERSON',
    type: 'code',
    description: 'ONS Local Authority GSS code (e.g. E08000028).',
  },

  // ---- TARGET level (per vaccine / condition) ----
  // For each known target, the same three attributes apply, per the
  // vims.elid_target_conditions_attributes lineage: every target record
  // has these three fields (LAST_SUCCESSFUL_DATE from NVR, the two
  // BOOKED_* fields from vims.bookings). We generate the entries
  // programmatically so adding a target is a one-line change.
  ...KNOWN_TARGETS.flatMap(target => [
    {
      name: 'LAST_SUCCESSFUL_DATE',
      level: 'TARGET' as const,
      type: 'date' as const,
      target,
      description: `Date the person last successfully received the ${target} vaccination.`,
    },
    {
      name: 'BOOKED_APPOINTMENT_DATE',
      level: 'TARGET' as const,
      type: 'date' as const,
      target,
      description: `Date of any future ${target} vaccination appointment.`,
    },
    {
      name: 'BOOKED_APPOINTMENT_PROVIDER',
      level: 'TARGET' as const,
      type: 'code' as const,
      target,
      description: `Provider for the ${target} booked appointment (e.g. NBS, MYA).`,
    },
  ]),

  // ---- COHORT level ----
  {
    name: 'COHORT_LABEL',
    level: 'COHORT',
    type: 'cohort',
    description: 'Use with Operator: MemberOf and a comma-separated list of cohort labels.',
  },
];

// Lookup helpers
const attributeIndex = new Map<string, AttributeDef>();
for (const a of ATTRIBUTES) {
  attributeIndex.set(`${a.level}:${a.target ?? ''}:${a.name}`, a);
}

export function getAttribute(
  name: string | undefined,
  level: AttributeLevel | undefined,
  target: string | undefined,
): AttributeDef | undefined {
  if (!name || !level) return undefined;
  // Prefer an exact (level, target, name) match. If no target is supplied,
  // also try the (level, '', name) fallback for PERSON-level attributes.
  const exact = attributeIndex.get(`${level}:${target ?? ''}:${name}`);
  if (exact) return exact;
  if (level === 'PERSON' || level === 'COHORT') {
    return attributeIndex.get(`${level}::${name}`);
  }
  return undefined;
}

export function attributesForLevel(level: AttributeLevel, target?: string): AttributeDef[] {
  return ATTRIBUTES.filter(a => {
    if (a.level !== level) return false;
    if (level === 'TARGET') return !target || a.target === target;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Operator catalog
// ---------------------------------------------------------------------------

export const OPERATORS: OperatorDef[] = [
  // ---- Comparison ----
  {
    symbol: '=',
    appliesTo: ['flag', 'code', 'text', 'cohort'],
    description: 'equals',
    example: 'CARE_HOME_FLAG = Y',
    comparatorHint: 'value to match exactly',
  },
  {
    symbol: '!=',
    appliesTo: ['flag', 'code', 'text', 'cohort', 'number'],
    description: 'not equal (NULL is never matched — use is_null for that)',
    comparatorHint: 'value to exclude',
  },
  {
    symbol: '<',
    appliesTo: ['date', 'code', 'number'],
    description: 'strictly less than',
    example: 'DATE_OF_BIRTH < 19440902',
    comparatorHint: 'a date (YYYYMMDD) or numeric value',
  },
  {
    symbol: '<=',
    appliesTo: ['date', 'code', 'number'],
    description: 'less than or equal to',
    comparatorHint: 'a date (YYYYMMDD) or numeric value',
  },
  {
    symbol: '>',
    appliesTo: ['date', 'code', 'number'],
    description: 'strictly greater than',
    comparatorHint: 'a date (YYYYMMDD) or numeric value',
  },
  {
    symbol: '>=',
    appliesTo: ['date', 'code', 'number'],
    description: 'greater than or equal to',
    comparatorHint: 'a date (YYYYMMDD) or numeric value',
  },

  // ---- String operators ----
  {
    symbol: 'contains',
    appliesTo: ['text', 'code'],
    description: 'value contains the substring (case-sensitive)',
    example: 'POSTCODE contains AB1',
    comparatorHint: 'substring to search for',
  },
  {
    symbol: 'not_contains',
    appliesTo: ['text', 'code'],
    description: 'value does NOT contain the substring (case-sensitive)',
    comparatorHint: 'substring to exclude',
  },
  {
    symbol: 'starts_with',
    appliesTo: ['text', 'code'],
    description: 'value starts with the substring',
    comparatorHint: 'substring prefix',
  },
  {
    symbol: 'not_starts_with',
    appliesTo: ['text', 'code'],
    description: 'value does NOT start with the substring',
    comparatorHint: 'substring prefix to exclude',
  },
  {
    symbol: 'ends_with',
    appliesTo: ['text', 'code'],
    description: 'value ends with the substring',
    comparatorHint: 'substring suffix',
  },

  // ---- List / set operators ----
  {
    symbol: 'in',
    appliesTo: ['code', 'cohort', 'text'],
    description: 'value is one of the listed options',
    example: 'ICB in QH8,QJG',
    comparatorHint: 'comma-separated list of values, no spaces',
  },
  {
    symbol: 'not_in',
    appliesTo: ['code', 'cohort', 'text'],
    description: 'value is NOT one of the listed options',
    comparatorHint: 'comma-separated list of values to exclude, no spaces',
  },
  {
    symbol: 'MemberOf',
    appliesTo: ['cohort'],
    description: 'person is a member of the listed cohort(s)',
    example: 'COHORT_LABEL MemberOf care_home_residents_older_adults',
    comparatorHint: 'one or more cohort labels, comma-separated, no spaces',
  },
  {
    symbol: 'NotMemberOf',
    appliesTo: ['cohort'],
    description: 'person is NOT a member of the listed cohort(s)',
    comparatorHint: 'one or more cohort labels, comma-separated, no spaces',
  },

  // ---- Null operators (no comparator) ----
  {
    symbol: 'is_null',
    appliesTo: ['date', 'flag', 'code', 'cohort', 'text', 'number'],
    description: 'value is NULL',
    comparatorHint: null,
  },
  {
    symbol: 'is_not_null',
    appliesTo: ['date', 'flag', 'code', 'cohort', 'text', 'number'],
    description: 'value is NOT NULL',
    comparatorHint: null,
  },

  // ---- Range operators (two bounds) ----
  {
    symbol: 'between',
    appliesTo: ['date', 'number', 'code'],
    description: 'value is between two bounds (inclusive)',
    comparatorHint: 'two values, comma-separated (e.g. 100,200)',
  },
  {
    symbol: 'not_between',
    appliesTo: ['date', 'number', 'code'],
    description: 'value is NOT between two bounds (inclusive)',
    comparatorHint: 'two values, comma-separated (e.g. 100,200)',
  },

  // ---- Empty / boolean operators (no comparator) ----
  {
    symbol: 'is_empty',
    appliesTo: ['text', 'code'],
    description: 'value is an empty string',
    comparatorHint: null,
  },
  {
    symbol: 'is_not_empty',
    appliesTo: ['text', 'code'],
    description: 'value is a non-empty string',
    comparatorHint: null,
  },
  {
    symbol: 'is_true',
    appliesTo: ['flag'],
    description: 'boolean value is true',
    comparatorHint: null,
  },
  {
    symbol: 'is_false',
    appliesTo: ['flag'],
    description: 'boolean value is false',
    comparatorHint: null,
  },

  // ---- Relative date: years ----
  {
    symbol: 'Y<=',
    appliesTo: ['date'],
    description: 'date is at least N years ago',
    example: 'LAST_SUCCESSFUL_DATE Y<= -25',
    comparatorHint: 'negative integer years (e.g. -25). Optional [[NVL:YYYYMMDD]] fallback for nulls.',
  },
  {
    symbol: 'Y<',
    appliesTo: ['date'],
    description: 'date is more than N years ago',
    comparatorHint: 'negative integer years (e.g. -25).',
  },
  {
    symbol: 'Y>=',
    appliesTo: ['date'],
    description: 'date is at most N years ago',
    example: 'LAST_SUCCESSFUL_DATE Y>= -25',
    comparatorHint: 'negative integer years (e.g. -25).',
  },
  {
    symbol: 'Y>',
    appliesTo: ['date'],
    description: 'date is less than N years ago (i.e. within the last N years)',
    example: 'DATE_OF_BIRTH Y> -75',
    comparatorHint: 'negative integer years (e.g. -75 for "age < 75").',
  },

  // ---- Relative date: days ----
  {
    symbol: 'D<=',
    appliesTo: ['date'],
    description: 'date is at least N days ago',
    comparatorHint: 'integer days.',
  },
  {
    symbol: 'D<',
    appliesTo: ['date'],
    description: 'date is more than N days ago (i.e. in the past beyond N days)',
    example: 'BOOKED_APPOINTMENT_DATE D< 0',
    comparatorHint: 'integer days.',
  },
  {
    symbol: 'D>=',
    appliesTo: ['date'],
    description: 'date is at most N days in the future',
    example: 'BOOKED_APPOINTMENT_DATE D>= 0',
    comparatorHint: 'integer days.',
  },
  {
    symbol: 'D>',
    appliesTo: ['date'],
    description: 'date is within the next N days',
    comparatorHint: 'integer days.',
  },

  // ---- Relative date: weeks ----
  {
    symbol: 'W<=',
    appliesTo: ['date'],
    description: 'date is at least N weeks ago',
    comparatorHint: 'integer weeks.',
  },
  {
    symbol: 'W<',
    appliesTo: ['date'],
    description: 'date is more than N weeks ago',
    comparatorHint: 'integer weeks.',
  },
  {
    symbol: 'W>=',
    appliesTo: ['date'],
    description: 'date is at most N weeks in the future',
    comparatorHint: 'integer weeks.',
  },
  {
    symbol: 'W>',
    appliesTo: ['date'],
    description: 'date is within the next N weeks',
    example: 'DATE_OF_BIRTH W> 114',
    comparatorHint: 'integer weeks (e.g. 114 ≈ 2 years 2 months).',
  },
];

const operatorIndex = new Map<string, OperatorDef>();
for (const o of OPERATORS) operatorIndex.set(o.symbol, o);

export function getOperator(symbol: string | undefined): OperatorDef | undefined {
  if (!symbol) return undefined;
  return operatorIndex.get(symbol);
}

export function operatorsForType(type: ValueType | undefined): OperatorDef[] {
  if (!type) return OPERATORS;
  return OPERATORS.filter(o => o.appliesTo.includes(type));
}

// ---------------------------------------------------------------------------
// Rule type semantics
// ---------------------------------------------------------------------------

export const RULE_TYPE_LABEL: Record<RuleType, string> = {
  F: 'Filter — removes a person from a cohort when the rule matches',
  S: 'Suppression — sets status to "not_actionable" when matched (typically RuleStop)',
  R: 'Action routing — fires when status is "actionable"',
  X: 'Not-eligible action — fires when status is "not_eligible"',
  Y: 'Not-actionable action — fires when status is "not_actionable"',
};

export const RULE_TYPE_COLOR: Record<RuleType, string> = {
  F: 'red',
  S: 'orange',
  R: 'blue',
  X: 'purple',
  Y: 'brown',
};

/**
 * ActionType values seen in the sample. ActionType is not strictly typed by the
 * API but these are the known values — any other value should be flagged.
 */
export const KNOWN_ACTION_TYPES = new Set<string>([
  'InfoText',
  'ButtonWithAuthLink',
  'ButtonWithAuthLinkWithInfoText',
  'ActionLinkWithInfoText',
  'CardWithText',
]);

/**
 * Frequency values for IterationFrequency at campaign level.
 */
export const KNOWN_FREQUENCIES: Record<string, string> = {
  X: 'One-off',
  D: 'Daily',
  W: 'Weekly',
  M: 'Monthly',
  Q: 'Quarterly',
  A: 'Annual',
};
