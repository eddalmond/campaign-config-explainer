import type { CampaignConfig } from '../types/campaign';

interface Props {
  config: CampaignConfig;
  onIterationSelect: (index: number) => void;
}

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  const s = String(d);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function descFreq(f: string | undefined): string {
  const map: Record<string, string> = { X: 'One-off (X)', D: 'Daily (D)', W: 'Weekly (W)', M: 'Monthly (M)', Q: 'Quarterly (Q)', A: 'Annual (A)' };
  return map[f || ''] || f || '—';
}

export default function CampaignOverview({ config, onIterationSelect }: Props) {
  const sortedIterations = [...config.Iterations].sort((a, b) => 
    (a.IterationDate || '').localeCompare(b.IterationDate || '')
  );

  return (
    <div className="bg-white border border-[#d8dde0] p-6 mb-8">
      <h2 className="text-xl font-bold mt-0 mb-4 border-b-3 border-[#005eb8] pb-2">Campaign Overview</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">ID</div>
          <div className="font-semibold mt-1">{config.ID}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Name</div>
          <div className="font-semibold mt-1">{config.Name}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Type</div>
          <div className="font-semibold mt-1">{config.Type === 'V' ? 'Vaccination (V)' : config.Type === 'S' ? 'Screening (S)' : config.Type}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Target</div>
          <div className="font-semibold mt-1">{config.Target}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Start Date</div>
          <div className="font-semibold mt-1">{fmtDate(config.StartDate)}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">End Date</div>
          <div className="font-semibold mt-1">{fmtDate(config.EndDate)}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Frequency</div>
          <div className="font-semibold mt-1">{descFreq(config.IterationFrequency)}</div>
        </div>
        <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
          <div className="text-xs uppercase tracking-wide text-[#4c6272]">Iterations</div>
          <div className="font-semibold mt-1">{config.Iterations.length}</div>
        </div>
      </div>

      <div className="bg-white border border-[#d8dde0] p-4">
        <label className="block font-semibold mb-2">Select Iteration</label>
        <select
          onChange={(e) => onIterationSelect(parseInt(e.target.value))}
          className="w-full md:w-auto min-w-[300px] p-2 border-2 border-[#212b32] bg-white"
        >
          {sortedIterations.map((it, i) => (
            <option key={i} value={i}>
              {it.Name || it.ID} — {fmtDate(it.IterationDate)} ({it.Type})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}