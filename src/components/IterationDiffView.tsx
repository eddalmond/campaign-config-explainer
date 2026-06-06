import type { IterationDiff, DiffChange } from '../utils/diff';

interface Props {
  diff: IterationDiff;
}

/**
 * Renders a structured diff between two iterations as a vertical list of
 * changes, grouped by section. Color-coded: green for added, red for
 * removed, yellow for modified, blue for renamed.
 */
export default function IterationDiffView({ diff }: Props) {
  const { changes, summary, fromName, toName } = diff;
  const bySection = groupBySection(changes);

  if (changes.length === 0) {
    return (
      <div className="iteration-diff">
        <div className="iteration-diff__empty">
          <strong>No changes.</strong> <span className="font-mono">{fromName}</span> and <span className="font-mono">{toName}</span> are identical.
        </div>
      </div>
    );
  }

  return (
    <div className="iteration-diff">
      <div className="iteration-diff__summary">
        <span className="iteration-diff__summary-pair">
          <span className="font-mono">{fromName}</span> → <span className="font-mono">{toName}</span>
        </span>
        <div className="iteration-diff__counters">
          {summary.added > 0 && <span className="diff-counter diff-counter--add">+{summary.added} added</span>}
          {summary.removed > 0 && <span className="diff-counter diff-counter--del">−{summary.removed} removed</span>}
          {summary.modified > 0 && <span className="diff-counter diff-counter--mod">~{summary.modified} modified</span>}
          {summary.renamed > 0 && <span className="diff-counter diff-counter--rename">⇄ {summary.renamed} renamed</span>}
        </div>
      </div>

      {(['cohort', 'rule', 'action', 'defaults', 'metadata', 'status-text'] as const).map(section => {
        const items = bySection.get(section) || [];
        if (items.length === 0) return null;
        return (
          <section key={section} className="iteration-diff__section">
            <h3 className="iteration-diff__section-title">
              {sectionLabel(section)} ({items.length})
            </h3>
            <ul className="iteration-diff__list">
              {items.map((c, i) => <DiffRow key={`${c.id}-${i}`} change={c} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function DiffRow({ change }: { change: DiffChange }) {
  return (
    <li className={`iteration-diff__row iteration-diff__row--${change.kind}`}>
      <span className={`iteration-diff__marker iteration-diff__marker--${change.kind}`} aria-hidden="true">
        {change.kind === 'added' ? '+' :
         change.kind === 'removed' ? '−' :
         change.kind === 'renamed' ? '⇄' : '~'}
      </span>
      <div className="iteration-diff__body">
        <div className="iteration-diff__summary-text">{change.summary}</div>
        {change.kind === 'renamed' && (
          <div className="iteration-diff__rename">
            <code className="code-inline">{change.renamedFrom || change.id}</code>
            <span className="iteration-diff__arrow">→</span>
            <code className="code-inline">{change.renamedTo}</code>
          </div>
        )}
        {change.changes && change.changes.length > 0 && (
          <ul className="iteration-diff__field-list">
            {change.changes.map((fc, i) => (
              <li key={i} className="iteration-diff__field">
                <span className="iteration-diff__field-name">{fc.field}:</span>
                <span className="iteration-diff__field-before">{fc.before || '—'}</span>
                <span className="iteration-diff__arrow">→</span>
                <span className="iteration-diff__field-after">{fc.after || '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function groupBySection(changes: DiffChange[]): Map<string, DiffChange[]> {
  const out = new Map<string, DiffChange[]>();
  for (const c of changes) {
    const list = out.get(c.section) ?? [];
    list.push(c);
    out.set(c.section, list);
  }
  return out;
}

function sectionLabel(section: string): string {
  switch (section) {
    case 'cohort': return 'Cohorts';
    case 'rule': return 'Rules';
    case 'action': return 'ActionsMapper';
    case 'defaults': return 'Default routings';
    case 'metadata': return 'Iteration settings';
    case 'status-text': return 'Status text';
    default: return section;
  }
}
