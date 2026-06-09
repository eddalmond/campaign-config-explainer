import { useMemo } from 'react';
import type { CampaignConfig } from '../types/campaign';
import { useAuthor } from '../hooks/AuthorContext';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  config: CampaignConfig;
  currentIterationIndex: number;
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

export default function CampaignOverview({ config, currentIterationIndex, onIterationSelect }: Props) {
  const { viewMode, duplicateIteration, deleteIteration } = useAuthor();
  const confirm = useConfirm();

  // Map the displayed index (sorted by IterationDate) back to the iteration ID
  // so we can call duplicateIteration/deleteIteration by ID.
  const sortedIterations = useMemo(
    () => [...config.Iterations].sort((a, b) =>
      (a.IterationDate || '').localeCompare(b.IterationDate || '')
    ),
    [config.Iterations]
  );

  const currentIteration = sortedIterations[currentIterationIndex];
  const isOnlyIteration = config.Iterations.length <= 1;

  const handleDuplicate = () => {
    if (!currentIteration) return;
    const newId = duplicateIteration(currentIteration.ID, 0);
    if (newId) {
      // Find the new iteration in the sorted list and select it.
      // Note: this runs synchronously after the state update, so we re-sort.
      // We use a microtask so the React state has flushed.
      queueMicrotask(() => {
        const idx = sortedIterations.findIndex(it => it.ID === currentIteration.ID);
        // The new one will be appended at the end of the un-sorted list, then
        // re-sorted. Easier: just count from the new total length - 1.
        // We rely on the App-level re-render to give us a fresh sortedIterations
        // — but for the immediate UI feedback we do a best-effort select by name.
        if (idx >= 0) onIterationSelect(idx);
      });
    }
  };

  const handleDelete = async () => {
    if (!currentIteration) return;
    if (isOnlyIteration) {
      // The Delete button is also disabled in this case, so this is a
      // belt-and-braces check that fires if anyone calls handleDelete
      // programmatically. We just no-op; the disabled button + tooltip
      // is the user-facing affordance.
      return;
    }
    const ok = await confirm({
      title: 'Delete iteration?',
      message: (
        <>
          Delete iteration <strong>{currentIteration.Name || currentIteration.ID}</strong>?
          This cannot be undone, but you can use <em>Reset</em> to recover
          the loaded version.
        </>
      ),
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteIteration(currentIteration.ID);
    // Snap the picker to a safe index after deletion.
    const newCount = config.Iterations.length - 1;
    if (currentIterationIndex >= newCount) onIterationSelect(Math.max(0, newCount - 1));
  };

  return (
    <div className="card" id="sec-campaign">
      <div className="section-heading-row">
        <h2 className="section-heading mt-0">Campaign Overview</h2>
        {viewMode === 'author' && (
          <button
            type="button"
            className="btn btn--secondary btn--small section-heading-row__edit"
            onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'campaign' } }))}
            title="Edit campaign-level fields (Name, Type, dates, Manager/Approver/Reviewer, defaults)"
          >
            Edit campaign settings
          </button>
        )}
      </div>

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
        <label className="form-label" htmlFor="iteration-picker">Select Iteration</label>
        <div className="iteration-picker-row">
          <select
            id="iteration-picker"
            value={currentIterationIndex}
            onChange={(e) => onIterationSelect(parseInt(e.target.value))}
            className="select-input"
          >
            {sortedIterations.map((it, i) => (
              <option key={it.ID} value={i}>
                {it.Name || it.ID} — {fmtDate(it.IterationDate)} ({it.Type})
              </option>
            ))}
          </select>
          {viewMode === 'author' && (
            <div className="iteration-picker-actions">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleDuplicate}
                disabled={!currentIteration}
                title="Duplicate the selected iteration as a new one. Bumps IterationNumber, resets Version, sets IterationDate to today."
              >
                Duplicate
              </button>
              <button
                type="button"
                className="btn btn--danger-text"
                onClick={handleDelete}
                disabled={!currentIteration || isOnlyIteration}
                title={isOnlyIteration ? 'Cannot delete the only remaining iteration — duplicate it first' : 'Delete the selected iteration'}
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {config.Iterations.length >= 2 && (
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'compare-iterations' } }))}
              title="See a side-by-side diff of all the changes between two iterations (cohorts, rules, actions)"
            >
              Compare iterations…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
