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
    return <p className="text-[#4c6272]">No action routing rules defined.</p>;
  }

  return (
    <div>
      <p className="text-sm text-[#4c6272] mb-4">
        <span className="inline-block bg-[#005eb8] text-white px-2 py-0.5 text-xs font-bold mr-1">R</span> fires when status = <strong>actionable</strong>
        <span className="inline-block bg-[#7C2855] text-white px-2 py-0.5 text-xs font-bold ml-3 mr-1">X</span> fires when status = <strong>not_eligible</strong>
        <span className="inline-block bg-[#8a6d3b] text-white px-2 py-0.5 text-xs font-bold ml-3 mr-1">Y</span> fires when status = <strong>not_actionable</strong>
      </p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#005eb8] text-white">
              <th className="p-2 text-left font-semibold uppercase text-xs">Type</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Priority</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Name</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Attribute Level</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Attribute Name</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Operator</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">Comparator</th>
              <th className="p-2 text-left font-semibold uppercase text-xs">CommsRouting</th>
            </tr>
          </thead>
          <tbody>
            {allRules.map((r, i) => {
              const routing = r.CommsRouting
                ? r.CommsRouting.split('|').map(c => <code key={c} className="mr-1">{c.trim()}</code>)
                : '—';
              const colorMap: Record<string, string> = { R: '#005eb8', X: '#7C2855', Y: '#8a6d3b' };
              return (
                <tr key={`${r.Type}_${i}`} className="border-b border-[#d8dde0] hover:bg-[#f0f4f5]">
                  <td className="p-2">
                    <span className="inline-block text-white px-2 py-0.5 text-xs font-bold rounded" style={{ backgroundColor: colorMap[r.Type] }}>
                      {r.Type}
                    </span>
                  </td>
                  <td className="p-2">{r.Priority}</td>
                  <td className="p-2">
                    <strong>{r.Name}</strong>
                    {r.Description && <div className="text-[#4c6272] text-xs">{r.Description}</div>}
                  </td>
                  <td className="p-2">{r.AttributeLevel || '—'}</td>
                  <td className="p-2">
                    <code className="text-xs">{r.AttributeName || '—'}</code>
                    {r.AttributeTarget && <div className="text-xs text-[#4c6272]">Target: {r.AttributeTarget}</div>}
                  </td>
                  <td className="p-2"><code className="text-xs">{r.Operator || '—'}</code></td>
                  <td className="p-2"><code className="text-xs">{r.Comparator || '—'}</code></td>
                  <td className="p-2">{routing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}