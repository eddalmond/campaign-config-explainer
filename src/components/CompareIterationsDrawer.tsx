import { useMemo, useState } from 'react';
import type { Iteration } from '../types/campaign';
import Drawer from './Drawer';
import IterationDiffView from './IterationDiffView';
import { diffIterations } from '../utils/diff';

interface Props {
  iterations: Iteration[];
  defaultFromId?: string;
  defaultToId?: string;
  onClose: () => void;
}

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  const s = String(d);
  if (/^<<.*>>$/.test(s)) return s; // template token — show as-is
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

/**
 * Drawer that lets the user pick two iterations to compare, then renders
 * the diff. The user controls which is "before" and which is "after" via
 * two dropdowns at the top of the drawer.
 *
 * Defaults: "from" = second-most-recent iteration, "to" = most recent.
 * This matches the natural authoring flow: "what did I change when I
 * created the latest iteration?"
 */
export default function CompareIterationsDrawer({
  iterations,
  defaultFromId,
  defaultToId,
  onClose,
}: Props) {
  // Sort by date asc so "most recent" is last
  const sorted = useMemo(
    () => [...iterations].sort((a, b) => (a.IterationDate || '').localeCompare(b.IterationDate || '')),
    [iterations]
  );

  // Default selection: second-to-last as "from", last as "to".
  // Fall back to first/last if there's only 2.
  const initialFrom = defaultFromId ?? (sorted.length >= 2 ? sorted[sorted.length - 2].ID : sorted[0]?.ID ?? '');
  const initialTo = defaultToId ?? (sorted[sorted.length - 1]?.ID ?? '');

  const [fromId, setFromId] = useState(initialFrom);
  const [toId, setToId] = useState(initialTo);

  const fromIter = sorted.find(it => it.ID === fromId);
  const toIter = sorted.find(it => it.ID === toId);

  const diff = useMemo(() => {
    if (!fromIter || !toIter) return null;
    return diffIterations(fromIter, toIter);
  }, [fromIter, toIter]);

  return (
    <Drawer
      open
      onClose={onClose}
      width={760}
      title="Compare iterations"
      subtitle="See what changed between two iterations"
    >
      {sorted.length < 2 ? (
        <div className="compare-iterations__empty">
          You need at least 2 iterations to compare. Use the <strong>Duplicate iteration</strong> button to make a second one.
        </div>
      ) : (
        <>
          <div className="compare-iterations__pickers">
            <div className="compare-iterations__picker">
              <label className="form-label" htmlFor="iter-diff-from">From (before)</label>
              <select
                id="iter-diff-from"
                className="text-input"
                value={fromId}
                onChange={e => setFromId(e.target.value)}
              >
                {sorted.map(it => (
                  <option key={it.ID} value={it.ID}>
                    {it.Name || it.ID} — {fmtDate(it.IterationDate)}
                  </option>
                ))}
              </select>
            </div>
            <div className="compare-iterations__arrow" aria-hidden="true">→</div>
            <div className="compare-iterations__picker">
              <label className="form-label" htmlFor="iter-diff-to">To (after)</label>
              <select
                id="iter-diff-to"
                className="text-input"
                value={toId}
                onChange={e => setToId(e.target.value)}
              >
                {sorted.map(it => (
                  <option key={it.ID} value={it.ID}>
                    {it.Name || it.ID} — {fmtDate(it.IterationDate)}
                  </option>
                ))}
              </select>
            </div>
            {fromId === toId && (
              <div className="form-hint" style={{ marginTop: '0.5rem' }}>
                Tip: pick two different iterations to see a diff.
              </div>
            )}
          </div>

          {diff && <IterationDiffView diff={diff} />}
        </>
      )}

      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
      </div>
    </Drawer>
  );
}
