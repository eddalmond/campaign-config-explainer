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
    <div className="card">
      <h2 className="section-heading mt-0">Campaign Overview</h2>
      
      <div className="data-grid mb-6">
        <div className="data-item data-item--blue">
          <div className="data-item__label">ID</div>
          <div className="data-item__value">{config.ID}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Name</div>
          <div className="data-item__value">{config.Name}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Type</div>
          <div className="data-item__value">{config.Type === 'V' ? 'Vaccination (V)' : config.Type === 'S' ? 'Screening (S)' : config.Type}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Target</div>
          <div className="data-item__value">{config.Target}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Start Date</div>
          <div className="data-item__value">{fmtDate(config.StartDate)}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">End Date</div>
          <div className="data-item__value">{fmtDate(config.EndDate)}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Frequency</div>
          <div className="data-item__value">{descFreq(config.IterationFrequency)}</div>
        </div>
        <div className="data-item data-item--blue">
          <div className="data-item__label">Iterations</div>
          <div className="data-item__value">{config.Iterations.length}</div>
        </div>
      </div>

      <div className="card form-group mb-0">
        <label className="form-label">Select Iteration</label>
        <select
          onChange={(e) => onIterationSelect(parseInt(e.target.value))}
          className="select-input"
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