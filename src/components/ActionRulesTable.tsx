import type { Rule } from '../types/campaign';
import { explainOperator, lookupAttribute, lookupOperator } from '../utils/explain';

interface Props {
  rRules: Rule[];
  xRules: Rule[];
  yRules: Rule[];
  /** All rules in iteration order, needed to map sorted rows back to their original index. */
  allRulesInOrder?: Rule[];
  onEditRule?: (originalIndex: number) => void;
}

export default function ActionRulesTable({ rRules, xRules, yRules, allRulesInOrder, onEditRule }: Props) {
  const allRules = [...rRules, ...xRules, ...yRules].sort((a, b) => {
    const order: Record<string, number> = { R: 0, X: 1, Y: 2 };
    return (order[a.Type] ?? 9) - (order[b.Type] ?? 9) || a.Priority - b.Priority;
  });

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

      <div className="table-container">
        <table className="data-table">
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
            {allRules.map((r, i) => {
              const routing = r.CommsRouting
                ? r.CommsRouting.split('|').map(c => <code key={c} className="code-inline" style={{marginRight: '4px'}}>{c.trim()}</code>)
                : '—';
              const badgeClass = r.Type === 'R' ? 'badge--r' : r.Type === 'X' ? 'badge--x' : 'badge--y';
              const attr = lookupAttribute(r);
              const op = lookupOperator(r.Operator);
              const explanation = explainOperator(r);
              const isUnknownAttribute = r.AttributeName && !attr;
              const isUnknownOperator = r.Operator && !op;
              // Map back to original index in the un-sorted iteration rules
              const originalIndex = onEditRule && allRulesInOrder
                ? allRulesInOrder.indexOf(r)
                : -1;
              return (
                <tr
                  key={`${r.Type}_${i}`}
                  style={{cursor: onEditRule ? 'pointer' : 'default'}}
                  onClick={onEditRule && originalIndex >= 0 ? () => onEditRule(originalIndex) : undefined}
                >
                  <td>
                    <span className={`badge ${badgeClass}`}>
                      {r.Type}
                    </span>
                  </td>
                  <td>{r.Priority}</td>
                  <td>
                    <strong>{r.Name}</strong>
                    {r.Description && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)'}}>{r.Description}</div>}
                  </td>
                  <td>{r.AttributeLevel || '—'}</td>
                  <td>
                    <code style={{
                      fontSize: 'var(--font-size-xs)',
                      textDecoration: isUnknownAttribute ? 'underline wavy var(--danger)' : 'none',
                    }}>{r.AttributeName || '—'}</code>
                    {r.AttributeTarget && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)'}}>Target: {r.AttributeTarget}</div>}
                  </td>
                  <td>
                    <code style={{
                      fontSize: 'var(--font-size-xs)',
                      textDecoration: isUnknownOperator ? 'underline wavy var(--danger)' : 'none',
                    }}>{r.Operator || '—'}</code>
                  </td>
                  <td>
                    <code style={{fontSize: 'var(--font-size-xs)'}}>{r.Comparator || '—'}</code>
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
                        title={originalIndex < 0 ? 'Cannot edit (rule not found in original list)' : 'Edit this rule'}
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
