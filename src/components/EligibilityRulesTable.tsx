import type { Rule } from '../types/campaign';
import { explainOperator, lookupAttribute, lookupOperator } from '../utils/explain';
import { sortWithOriginalIndex } from '../utils/sortWithIndex';

interface Props {
  filterRules: Rule[];
  suppressionRules: Rule[];
  /** All rules in iteration order, needed to map sorted rows back to their original index. */
  allRulesInOrder?: Rule[];
  onEditRule?: (originalIndex: number) => void;
}

export default function EligibilityRulesTable({ filterRules, suppressionRules, allRulesInOrder, onEditRule }: Props) {
  const original = allRulesInOrder ?? [...filterRules, ...suppressionRules];
  const allRules = [...filterRules, ...suppressionRules].sort((a, b) => a.Type.localeCompare(b.Type) || a.Priority - b.Priority);
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

  return (
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
                <th>Cohort Scope</th>
                <th>RuleStop</th>
                {onEditRule && <th></th>}
              </tr>
            </thead>
          <tbody>
            {allRules.map((r, i) => {
              const scope = r.CohortLabel
                ? r.CohortLabel.split(',').map(l => <span key={l} className="code-inline" style={{marginRight: '4px'}}>{l.trim()}</span>)
                : <em>all cohorts</em>;
              const attr = lookupAttribute(r);
              const op = lookupOperator(r.Operator);
              const explanation = explainOperator(r);
              const isUnknownAttribute = r.AttributeName && !attr;
              const isUnknownOperator = r.Operator && !op;
              return (
                <tr key={`${r.Type}_${i}`} style={{cursor: onEditRule ? 'pointer' : 'default'}} onClick={onEditRule ? () => onEditRule(lookupOriginal(r)) : undefined}>
                  <td>
                    <span className={`badge ${r.Type === 'F' ? 'bg-red' : 'bg-orange'}`}>
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
                  <td>{scope}</td>
                  <td>{r.RuleStop === true || r.RuleStop === 'Y' ? '⛔ Yes' : '—'}</td>
                  {onEditRule && (
                    <td>
                      <button
                        type="button"
                        className="btn btn--small"
                        onClick={(e) => { e.stopPropagation(); onEditRule(lookupOriginal(r)); }}
                        title="Edit this rule"
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
  );
}