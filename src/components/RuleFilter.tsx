import type { RuleType } from '../types/campaign';
import type { RuleFilterState } from '../utils/ruleFilter';
export type { RuleFilterState } from '../utils/ruleFilter';

interface Props {
  state: RuleFilterState;
  onChange: (next: RuleFilterState) => void;
  /** Which rule types to show as filter chips. Defaults to all five. */
  availableTypes?: RuleType[];
  /** Total rule count in the unfiltered set (for "Showing N of M" text). */
  totalCount: number;
  /** Rule count after the filter is applied. */
  filteredCount: number;
}

const DEFAULT_TYPES: RuleType[] = ['F', 'S', 'R', 'X', 'Y'];

const TYPE_LABEL: Record<RuleType, string> = {
  F: 'Filter', S: 'Suppression', R: 'Action', X: 'Not eligible', Y: 'Not actionable',
};

/**
 * Filter bar shown above the rule tables. When the user is in author
 * mode, typing in the priority range / query / chipping a type updates
 * the filter; the table re-renders with the filtered subset.
 */
export default function RuleFilter({
  state, onChange, availableTypes, totalCount, filteredCount,
}: Props) {
  const types = availableTypes ?? DEFAULT_TYPES;
  const toggleType = (t: RuleType) => {
    const next = state.types.includes(t)
      ? state.types.filter(x => x !== t)
      : [...state.types, t];
    onChange({ ...state, types: next });
  };
  const resetAll = () => onChange({ types: [] });
  const isFiltering = state.types.length > 0 || state.priorityMin != null || state.priorityMax != null || !!state.query;

  return (
    <div className="rule-filter">
      <div className="rule-filter__row">
        <span className="rule-filter__label">Type:</span>
        <div className="rule-filter__chips" role="group" aria-label="Filter by rule type">
          {types.map(t => (
            <button
              key={t}
              type="button"
              className={`rule-filter__chip ${state.types.includes(t) ? 'rule-filter__chip--active' : ''}`}
              onClick={() => toggleType(t)}
              aria-pressed={state.types.includes(t)}
            >
              <span className={`badge badge--${t.toLowerCase()}`}>{t}</span>
              <span className="rule-filter__chip-label">{TYPE_LABEL[t]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rule-filter__row">
        <span className="rule-filter__label">Priority:</span>
        <input
          type="number"
          className="text-input rule-filter__number"
          placeholder="min"
          value={state.priorityMin ?? ''}
          onChange={(e) => onChange({ ...state, priorityMin: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        <span className="rule-filter__dash">—</span>
        <input
          type="number"
          className="text-input rule-filter__number"
          placeholder="max"
          value={state.priorityMax ?? ''}
          onChange={(e) => onChange({ ...state, priorityMax: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
        <span className="rule-filter__label rule-filter__label--spaced">Search:</span>
        <input
          type="text"
          className="text-input rule-filter__text"
          placeholder="name / attribute / operator / comparator / routing…"
          value={state.query ?? ''}
          onChange={(e) => onChange({ ...state, query: e.target.value || undefined })}
        />
        {isFiltering && (
          <button
            type="button"
            className="btn btn--small btn--secondary"
            onClick={resetAll}
          >
            Clear filters
          </button>
        )}
        <span className="rule-filter__count">
          Showing {filteredCount} of {totalCount} rules
        </span>
      </div>
    </div>
  );
}
