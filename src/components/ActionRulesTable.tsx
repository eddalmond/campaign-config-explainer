import type { Rule } from '../types/campaign';

interface Props {
  rRules: Rule[];
  xRules: Rule[];
  yRules: Rule[];
}

export default function ActionRulesTable({ rRules, xRules, yRules }: Props) {
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
            </tr>
          </thead>
          <tbody>
            {allRules.map((r, i) => {
              const routing = r.CommsRouting
                ? r.CommsRouting.split('|').map(c => <code key={c} className="code-inline" style={{marginRight: '4px'}}>{c.trim()}</code>)
                : '—';
              const badgeClass = r.Type === 'R' ? 'badge--r' : r.Type === 'X' ? 'badge--x' : 'badge--y';
              return (
                <tr key={`${r.Type}_${i}`}>
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
                    <code style={{fontSize: 'var(--font-size-xs)'}}>{r.AttributeName || '—'}</code>
                    {r.AttributeTarget && <div style={{fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)'}}>Target: {r.AttributeTarget}</div>}
                  </td>
                  <td><code style={{fontSize: 'var(--font-size-xs)'}}>{r.Operator || '—'}</code></td>
                  <td><code style={{fontSize: 'var(--font-size-xs)'}}>{r.Comparator || '—'}</code></td>
                  <td>{routing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}