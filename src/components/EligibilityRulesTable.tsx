import { useState } from 'react';
import type { Rule, RuleType } from '../types/campaign';
import { explainOperator, lookupAttribute, lookupOperator } from '../utils/explain';
import { sortWithOriginalIndex } from '../utils/sortWithIndex';
import InlineEditableCell from './InlineEditableCell';
import RuleFilter from './RuleFilter';
import BulkRuleActions, { type BulkPatch } from './BulkRuleActions';
import { applyRuleFilter, type RuleFilterState } from '../utils/ruleFilter';

interface Props {
  filterRules: Rule[];
  suppressionRules: Rule[];
  /** All rules in iteration order, needed to map sorted rows back to their original index. */
  allRulesInOrder?: Rule[];
  onEditRule?: (originalIndex: number) => void;
  /**
   * Inline-edit callback. When present, simple-value cells become
   * click-to-edit; complex-value cells (CohortLabel, CommsRouting)
   * still open the drawer via onEditRule.
   */
  onUpdateRule?: (originalIndex: number, patch: Partial<Rule>) => void;
  /**
   * Bulk-edit callback for the <BulkRuleActions /> toolbar. The parent
   * (IterationDetail) implements this as a single updateIteration() call
   * so the working copy is updated atomically and the rule-sentence /
   * diagram re-renders once for the whole batch.
   */
  onBulkUpdate?: (patches: BulkPatch[]) => void;
}

const EMPTY_FILTER: RuleFilterState = { types: [] };

export default function EligibilityRulesTable({ filterRules, suppressionRules, allRulesInOrder, onEditRule, onUpdateRule, onBulkUpdate }: Props) {
  const original = allRulesInOrder ?? [...filterRules, ...suppressionRules];
  const allRules = [...filterRules, ...suppressionRules].sort((a, b) => a.Type.localeCompare(b.Type) || a.Priority - b.Priority);
  const [filter, setFilter] = useState<RuleFilterState>(EMPTY_FILTER);
  const filteredRules = applyRuleFilter(allRules, filter);

  const sortedMap = sortWithOriginalIndex(
    original,
    (a, b) => a.Type.localeCompare(b.Type) || a.Priority - b.Priority,
  );
  const lookupOriginal = (rule: Rule) => {
    const idx = sortedMap.sorted.indexOf(rule);
    return idx >= 0 ? sortedMap.originalIndex(idx) : -1;
  };

  if (allRules.length === 0) {
    return <p className="page-description">No eligibility rules defined.</p>;
  }

  // For the bulk-actions toolbar: each filtered rule paired with its
  // original index in iteration.IterationRules. Uses allRulesInOrder
  // if provided (author mode), else falls back to the combined list.
  const filteredWithIndex = filteredRules.map((rule) => ({
    rule,
    originalIndex: (allRulesInOrder ?? original).indexOf(rule),
  })).filter(({ originalIndex }) => originalIndex >= 0);

  return (
    <div>
      {onUpdateRule && (
        <RuleFilter
          state={filter}
          onChange={setFilter}
          totalCount={allRules.length}
          filteredCount={filteredRules.length}
          extraActions={onBulkUpdate ? (
            <BulkRuleActions
              filtered={filteredWithIndex}
              onApply={onBulkUpdate}
            />
          ) : undefined}
        />
      )}

      <div className="table-container">
        <table className="data-table data-table--editable">
          <thead>
            <tr>
              <th>Type</th>
              <th>Priority</th>
              <th>Name</th>
              <th>Attribute Level</th>
              <th>Attribute Name</th>
              <th>Operator</th>
              <th>Comparator</th>
              <th>Cohort Scope</th>
              <th>RuleStop</th>
              {onEditRule && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((r, i) => {
              const scope = r.CohortLabel
                ? r.CohortLabel.split(',').map(l => <span key={l} className="code-inline" style={{marginRight: '4px'}}>{l.trim()}</span>)
                : <em>all cohorts</em>;
              const attr = lookupAttribute(r);
              const op = lookupOperator(r.Operator);
              const explanation = explainOperator(r);
              const isUnknownAttribute = r.AttributeName && !attr;
              const isUnknownOperator = r.Operator && !op;
              const originalIndex = lookupOriginal(r);
              const update = onUpdateRule ? (patch: Partial<Rule>) => onUpdateRule(originalIndex, patch) : undefined;
              return (
                <tr key={`${r.Type}_${originalIndex}_${i}`} style={{cursor: onEditRule ? 'pointer' : 'default'}} onClick={onEditRule ? () => onEditRule(lookupOriginal(r)) : undefined}>
                  <td>
                    <InlineEditableCell<RuleType>
                      value={r.Type}
                      onSave={update ? (next) => update({ Type: next }) : undefined}
                      renderDisplay={(v) => <span className={`badge ${v === 'F' ? 'bg-red' : 'bg-orange'}`}>{v}</span>}
                      validate={(s) => ['F', 'S', 'R', 'X', 'Y'].includes(s) ? null : 'Must be F, S, R, X, or Y'}
                    />
                  </td>
                  <td>
                    <InlineEditableCell<number>
                      value={r.Priority}
                      onSave={update ? (next) => update({ Priority: next }) : undefined}
                      validate={(s) => {
                        const n = Number(s);
                        if (!Number.isFinite(n)) return 'Must be a number';
                        return null;
                      }}
                      parse={(s) => Number(s)}
                    />
                  </td>
                  <td>
                    <InlineEditableCell<string>
                      value={r.Name}
                      onSave={update ? (next) => update({ Name: next.trim() }) : undefined}
                      validate={(s) => s.trim() ? null : 'Name is required'}
                    />
                    {r.Description && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)'}}>{r.Description}</div>}
                  </td>
                  <td>
                    <InlineEditableCell<string>
                      value={r.AttributeLevel ?? ''}
                      onSave={update ? (next) => update({ AttributeLevel: (next || undefined) as Rule['AttributeLevel'] }) : undefined}
                      renderDisplay={(v) => v || '—'}
                    />
                  </td>
                  <td>
                    <InlineEditableCell<string>
                      value={r.AttributeName ?? ''}
                      onSave={update ? (next) => update({ AttributeName: next || undefined }) : undefined}
                      renderDisplay={(v) => v ? (
                        <code style={{
                          fontSize: 'var(--font-size-xs)',
                          textDecoration: isUnknownAttribute ? 'underline wavy var(--danger)' : 'none',
                        }}>{v}</code>
                      ) : <span style={{ color: 'var(--grey-1)' }}>—</span>}
                      muted
                      title={isUnknownAttribute ? 'Attribute not in the catalog' : undefined}
                    />
                    {r.AttributeTarget && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)'}}>Target: {r.AttributeTarget}</div>}
                  </td>
                  <td>
                    <InlineEditableCell<string>
                      value={r.Operator ?? ''}
                      onSave={update ? (next) => update({ Operator: next || undefined }) : undefined}
                      renderDisplay={(v) => v ? (
                        <code style={{
                          fontSize: 'var(--font-size-xs)',
                          textDecoration: isUnknownOperator ? 'underline wavy var(--danger)' : 'none',
                        }}>{v}</code>
                      ) : <span style={{ color: 'var(--grey-1)' }}>—</span>}
                      muted
                      title={isUnknownOperator ? 'Operator not in the catalog' : undefined}
                    />
                  </td>
                  <td>
                    <InlineEditableCell<string>
                      value={r.Comparator ?? ''}
                      onSave={update ? (next) => update({ Comparator: next || undefined }) : undefined}
                      renderDisplay={(v) => v ? <code style={{fontSize: 'var(--font-size-xs)'}}>{v}</code> : <span style={{ color: 'var(--grey-1)' }}>—</span>}
                      muted
                    />
                    {r.Operator && r.Comparator && (
                      <div className="rule-explanation">{explanation}</div>
                    )}
                  </td>
                  <td>{scope}</td>
                  <td>
                    <InlineEditableCell<boolean>
                      value={r.RuleStop === true || r.RuleStop === 'Y'}
                      onSave={update ? (next) => update({ RuleStop: next ? 'Y' : undefined }) : undefined}
                      renderDisplay={(v) => v ? '⛔ Yes' : '—'}
                    />
                  </td>
                  {onEditRule && (
                    <td>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={(e) => { e.stopPropagation(); onEditRule(lookupOriginal(r)); }}
                        title="Open the full rule editor (for CohortLabel, CommsRouting, Description, etc.)"
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
