import { useState } from 'react';
import type { Rule, RuleType } from '../types/campaign';
import { explainOperator, lookupAttribute, lookupOperator } from '../utils/explain';
import InlineEditableCell from './InlineEditableCell';
import RuleFilter from './RuleFilter';
import { applyRuleFilter, type RuleFilterState } from '../utils/ruleFilter';

interface Props {
  rRules: Rule[];
  xRules: Rule[];
  yRules: Rule[];
  /** All rules in iteration order, needed to map sorted rows back to their original index. */
  allRulesInOrder?: Rule[];
  onEditRule?: (originalIndex: number) => void;
  /**
   * Inline-edit callback. When present, simple-value cells become
   * click-to-edit; complex-value cells (CommsRouting) still open the
   * drawer via onEditRule.
   */
  onUpdateRule?: (originalIndex: number, patch: Partial<Rule>) => void;
}

const ROUTING_TYPES: RuleType[] = ['R', 'X', 'Y'];
const EMPTY_FILTER: RuleFilterState = { types: [] };

export default function ActionRulesTable({ rRules, xRules, yRules, allRulesInOrder, onEditRule, onUpdateRule }: Props) {
  const allRules = [...rRules, ...xRules, ...yRules].sort((a, b) => {
    const order: Record<string, number> = { R: 0, X: 1, Y: 2 };
    return (order[a.Type] ?? 9) - (order[b.Type] ?? 9) || a.Priority - b.Priority;
  });
  const [filter, setFilter] = useState<RuleFilterState>(EMPTY_FILTER);
  const filteredRules = applyRuleFilter(allRules, filter);

  if (allRules.length === 0) {
    return <p className="page-description">No action routing rules defined.</p>;
  }

  return (
    <div>
      <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>
        <span className="badge badge--r" style={{marginRight: '0.25rem'}}>R</span> fires when status = <strong>actionable</strong>
        <span className="badge badge--x" style={{marginLeft: '0.75rem', marginRight: '0.25rem'}}>X</span> fires when status = <strong>not_eligible</strong>
        <span className="badge badge--y" style={{marginLeft: '0.75rem', marginRight: '0.25rem'}}>Y</span> fires when status = <strong>not_actionable</strong>
      </p>

      {onUpdateRule && <RuleFilter state={filter} onChange={setFilter} availableTypes={ROUTING_TYPES} totalCount={allRules.length} filteredCount={filteredRules.length} />}

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
              <th>CommsRouting</th>
              {onEditRule && <th></th>}
            </tr>
          </thead>
          <tbody>
            {filteredRules.map((r, i) => {
              const routing = r.CommsRouting
                ? r.CommsRouting.split('|').map(c => <code key={c} className="code-inline" style={{marginRight: '4px'}}>{c.trim()}</code>)
                : '—';
              const attr = lookupAttribute(r);
              const op = lookupOperator(r.Operator);
              const explanation = explainOperator(r);
              const isUnknownAttribute = r.AttributeName && !attr;
              const isUnknownOperator = r.Operator && !op;
              // Map back to original index in the un-sorted iteration rules
              const originalIndex = (allRulesInOrder && onUpdateRule)
                ? allRulesInOrder.indexOf(r)
                : -1;
              const update = onUpdateRule && originalIndex >= 0
                ? (patch: Partial<Rule>) => onUpdateRule(originalIndex, patch)
                : undefined;
              return (
                <tr
                  key={`${r.Type}_${originalIndex}_${i}`}
                  style={{cursor: onEditRule ? 'pointer' : 'default'}}
                  onClick={onEditRule && originalIndex >= 0 ? () => onEditRule(originalIndex) : undefined}
                >
                  <td>
                    <InlineEditableCell<RuleType>
                      value={r.Type}
                      onSave={update ? (next) => update({ Type: next }) : undefined}
                      renderDisplay={(v) => <span className={`badge ${v === 'R' ? 'badge--r' : v === 'X' ? 'badge--x' : 'badge--y'}`}>{v}</span>}
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
                  <td>{routing}</td>
                  {onEditRule && (
                    <td>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={(e) => { e.stopPropagation(); if (originalIndex >= 0) onEditRule(originalIndex); }}
                        disabled={originalIndex < 0}
                        title={originalIndex < 0 ? 'Cannot edit (rule not found in original list)' : 'Open the full rule editor (for CommsRouting, CohortLabel, Description, etc.)'}
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
