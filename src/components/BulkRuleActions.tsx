import { useState } from 'react';
import type { Rule } from '../types/campaign';
import { useConfirm } from '../hooks/useConfirm';

export interface BulkPatch {
  originalIndex: number;
  patch: Partial<Rule>;
}

interface Props {
  /** The rules currently in the filtered set, in iteration order, with
   *  their originalIndex (index in the un-sorted iteration.IterationRules
   *  array). The table computes this for us. */
  filtered: Array<{ rule: Rule; originalIndex: number }>;
  /** Whether this table's rules can carry a routing code (only R/X/Y). */
  hasCommsRouting?: boolean;
  /** Apply the patches atomically. The parent (IterationDetail)
   *  implements this as a single updateIteration() call. */
  onApply: (patches: BulkPatch[]) => void;
}

/**
 * Bulk operations on the *currently filtered* rule set:
 *   - Toggle RuleStop (set/clear) for all filtered rules
 *   - Bump Priority by ±N for all filtered rules
 *   - Replace a substring in CommsRouting (R/X/Y tables only)
 *
 * Each action prompts a confirm dialog before applying. The filtered
 * set is the scope: the user uses the existing filter chips/priority
 * range/query to select which rules to operate on. No checkboxes.
 *
 * Undo isn't implemented here — see the open follow-up in
 * docs/ux-review-and-improvement-plan.md. The confirm dialog
 * is the safety net.
 */
export default function BulkRuleActions({ filtered, hasCommsRouting, onApply }: Props) {
  const confirm = useConfirm();
  const [open, setOpen] = useState<null | 'menu' | 'ruleStop' | 'priority' | 'routing'>(null);

  if (filtered.length === 0) return null;

  const applySetRuleStop = async (value: boolean) => {
    const ok = await confirm({
      title: value ? 'Set RuleStop on N rules?' : 'Clear RuleStop on N rules?',
      message: (
        <>
          This will {value ? <strong>set</strong> : <strong>clear</strong>} RuleStop
          on <strong>{filtered.length}</strong> filtered
          rule{filtered.length === 1 ? '' : 's'}. RuleStop halts evaluation
          in its priority group when matched.
        </>
      ),
      confirmLabel: value ? 'Set RuleStop' : 'Clear RuleStop',
      destructive: value, // Setting RuleStop changes routing behaviour, treat as impactful
    });
    if (!ok) return;
    onApply(filtered.map(({ originalIndex }) => ({
      originalIndex,
      patch: { RuleStop: value ? 'Y' : undefined },
    })));
  };

  const applyBumpPriority = async (delta: number) => {
    if (delta === 0) return;
    const ok = await confirm({
      title: `Bump priority by ${delta > 0 ? '+' : ''}${delta}?`,
      message: (
        <>
          This will shift the Priority of <strong>{filtered.length}</strong>
          filtered rule{filtered.length === 1 ? '' : 's'} by <strong>{delta > 0 ? '+' : ''}{delta}</strong>.
          Rule evaluation order is by ascending priority.
        </>
      ),
      confirmLabel: `Bump ${delta > 0 ? '+' : ''}${delta}`,
    });
    if (!ok) return;
    onApply(filtered.map(({ rule, originalIndex }) => ({
      originalIndex,
      patch: { Priority: (rule.Priority ?? 0) + delta },
    })));
  };

  const applyReplaceRouting = async (find: string, replace: string) => {
    if (!find) return;
    const matches = filtered.filter(({ rule }) => rule.CommsRouting?.includes(find));
    if (matches.length === 0) {
      // No matches — silently bail. The popover has already closed, so
      // the user sees no changes happen; they can re-open and try a
      // different find string. We don't pop a confirmation dialog here
      // because the operation is read-only at this point (no risk).
      return;
    }
    const ok = await confirm({
      title: `Replace ${find} in N rules?`,
      message: (
        <>
          Replace <code>{find}</code> with <code>{replace || '(empty)'}</code>
          in <strong>{matches.length}</strong> filtered
          rule{matches.length === 1 ? '' : 's'}. Rules with no CommsRouting or
          no match for the search string are skipped.
        </>
      ),
      confirmLabel: 'Replace',
      destructive: true,
    });
    if (!ok) return;
    onApply(matches.map(({ rule, originalIndex }) => {
      const newRouting = rule.CommsRouting!.split(find).join(replace);
      return { originalIndex, patch: { CommsRouting: newRouting } };
    }));
  };

  return (
    <div className="bulk-actions">
      <button
        type="button"
        className="btn btn--secondary btn--small"
        onClick={() => setOpen(open === 'menu' ? null : 'menu')}
        aria-expanded={open === 'menu'}
        title="Bulk-edit the currently filtered rules"
      >
        Bulk actions ({filtered.length})
      </button>
      {open === 'menu' && (
        <div className="bulk-actions__menu" role="menu">
          <button
            type="button"
            className="bulk-actions__menu-item"
            onClick={() => setOpen('ruleStop')}
            role="menuitem"
          >
            Toggle RuleStop…
          </button>
          <button
            type="button"
            className="bulk-actions__menu-item"
            onClick={() => setOpen('priority')}
            role="menuitem"
          >
            Bump priority by ±N…
          </button>
          {hasCommsRouting && (
            <button
              type="button"
              className="bulk-actions__menu-item"
              onClick={() => setOpen('routing')}
              role="menuitem"
            >
              Replace CommsRouting code…
            </button>
          )}
          <div className="bulk-actions__menu-hint">
            Applies to the {filtered.length} rule{filtered.length === 1 ? '' : 's'} currently
            matching your filter chips/priority range/search query.
          </div>
        </div>
      )}

      {open === 'ruleStop' && (
        <RuleStopDialog
          onCancel={() => setOpen(null)}
          onSet={() => { setOpen(null); applySetRuleStop(true); }}
          onClear={() => { setOpen(null); applySetRuleStop(false); }}
          count={filtered.length}
        />
      )}
      {open === 'priority' && (
        <PriorityDialog
          onCancel={() => setOpen(null)}
          onApply={(delta) => { setOpen(null); applyBumpPriority(delta); }}
          count={filtered.length}
        />
      )}
      {open === 'routing' && (
        <RoutingDialog
          onCancel={() => setOpen(null)}
          onApply={(find, replace) => { setOpen(null); applyReplaceRouting(find, replace); }}
          count={filtered.length}
        />
      )}
    </div>
  );
}

function RuleStopDialog({ onCancel, onSet, onClear, count }: {
  onCancel: () => void; onSet: () => void; onClear: () => void; count: number;
}) {
  return (
    <div className="bulk-actions__popover" role="dialog" aria-label="Toggle RuleStop">
      <div className="bulk-actions__popover-title">Toggle RuleStop on {count} filtered rule{count === 1 ? '' : 's'}</div>
      <div className="bulk-actions__popover-body">
        RuleStop halts evaluation in its priority group when the rule matches.
        Useful for breaking out of an "all must match" priority group early.
      </div>
      <div className="bulk-actions__popover-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn--secondary btn--small" onClick={onClear} title="Remove RuleStop from these rules">
          Clear RuleStop
        </button>
        <button type="button" className="btn btn--primary btn--small" onClick={onSet} title="Add RuleStop to these rules">
          Set RuleStop
        </button>
      </div>
    </div>
  );
}

function PriorityDialog({ onCancel, onApply, count }: {
  onCancel: () => void; onApply: (delta: number) => void; count: number;
}) {
  const [delta, setDelta] = useState<string>('10');
  const parsed = Number(delta);
  const valid = Number.isFinite(parsed) && parsed !== 0;
  return (
    <div className="bulk-actions__popover" role="dialog" aria-label="Bump priority">
      <div className="bulk-actions__popover-title">Bump priority on {count} filtered rule{count === 1 ? '' : 's'}</div>
      <div className="bulk-actions__popover-body">
        <label htmlFor="bulk-priority-delta" className="form-label">Shift by (e.g. -10, +5)</label>
        <input
          id="bulk-priority-delta"
          type="number"
          className="text-input"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) onApply(parsed);
            else if (e.key === 'Escape') onCancel();
          }}
        />
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)', marginTop: '0.25rem' }}>
          Negative = lower priority = evaluated earlier.
        </div>
      </div>
      <div className="bulk-actions__popover-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn--primary btn--small"
          onClick={() => onApply(parsed)}
          disabled={!valid}
          title={valid ? `Shift priorities by ${parsed}` : 'Enter a non-zero number'}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function RoutingDialog({ onCancel, onApply, count }: {
  onCancel: () => void; onApply: (find: string, replace: string) => void; count: number;
}) {
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  return (
    <div className="bulk-actions__popover" role="dialog" aria-label="Replace CommsRouting">
      <div className="bulk-actions__popover-title">Replace CommsRouting on {count} filtered rule{count === 1 ? '' : 's'}</div>
      <div className="bulk-actions__popover-body">
        <label htmlFor="bulk-routing-find" className="form-label">Find</label>
        <input
          id="bulk-routing-find"
          type="text"
          className="text-input"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="e.g. INFO_TEXT"
          autoFocus
        />
        <label htmlFor="bulk-routing-replace" className="form-label" style={{ marginTop: '0.5rem' }}>Replace with</label>
        <input
          id="bulk-routing-replace"
          type="text"
          className="text-input"
          value={replace}
          onChange={(e) => setReplace(e.target.value)}
          placeholder="e.g. INFO_TEXT_V2 (or leave empty to remove)"
        />
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--grey-1)', marginTop: '0.25rem' }}>
          Substring match. Splits on pipe-separated routing codes too: e.g. <code>INFO_TEXT|NUDGE</code> will find rules containing <code>INFO_TEXT</code> and replace it within the string.
        </div>
      </div>
      <div className="bulk-actions__popover-actions">
        <button type="button" className="btn btn--secondary btn--small" onClick={onCancel}>Cancel</button>
        <button
          type="button"
          className="btn btn--danger btn--small"
          onClick={() => onApply(find, replace)}
          disabled={!find}
          title={find ? `Replace ${find} with ${replace || '(empty)'} in matching rules` : 'Enter a search string'}
        >
          Replace
        </button>
      </div>
    </div>
  );
}
