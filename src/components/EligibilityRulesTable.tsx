import type { Rule } from '../types/campaign';

interface Props {
  filterRules: Rule[];
  suppressionRules: Rule[];
}

export default function EligibilityRulesTable({ filterRules, suppressionRules }: Props) {
  const allRules = [...filterRules, ...suppressionRules].sort((a, b) => a.Type.localeCompare(b.Type) || a.Priority - b.Priority);

  if (allRules.length === 0) {
    return <p className="text-[#4c6272]">No eligibility rules defined.</p>;
  }

  return (
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
            <th className="p-2 text-left font-semibold uppercase text-xs">Cohort Scope</th>
            <th className="p-2 text-left font-semibold uppercase text-xs">RuleStop</th>
          </tr>
        </thead>
        <tbody>
          {allRules.map((r, i) => {
            const scope = r.CohortLabel
              ? r.CohortLabel.split(',').map(l => <span key={l} className="inline-block bg-[#e8edee] border border-[#aeb7bd] px-2 py-0.5 rounded-full text-xs mr-1">{l.trim()}</span>)
              : <em className="text-[#4c6272]">all cohorts</em>;
            return (
              <tr key={`${r.Type}_${i}`} className="border-b border-[#d8dde0] hover:bg-[#f0f4f5] cursor-pointer">
                <td className="p-2">
                  <span className={`inline-block text-white px-2 py-0.5 text-xs font-bold rounded ${r.Type === 'F' ? 'bg-[#d81e05]' : 'bg-[#e68300]'}`}>
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
                <td className="p-2">{scope}</td>
                <td className="p-2">{r.RuleStop === true || r.RuleStop === 'Y' ? '⛔ Yes' : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}