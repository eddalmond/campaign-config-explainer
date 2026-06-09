import { useState, type ReactNode } from 'react';

interface Props {
  /** Short title shown in the heading. */
  title: ReactNode;
  /** Optional content for the section-heading-row's right side
   *  (e.g. "Edit X settings" buttons). */
  actions?: ReactNode;
  /** If true, the section renders collapsed by default. The user can
   *  expand it via the toggle. */
  defaultCollapsed?: boolean;
  /** If true, the section is *not* collapsible (toggle hidden). */
  alwaysExpanded?: boolean;
  /** id used for scroll-targeting and the sticky section nav. */
  id: string;
  /** Section number (1–6). Rendered as the numbered badge. */
  number?: number;
  children: ReactNode;
}

/**
 * A card section with a heading, optional numbered badge, optional
 * "Edit X" actions, and an optional collapse toggle.
 *
 * Used by IterationDetail to break the long page into independently
 * scrollable, independently collapsible cards. Replaces the old pattern
 * of one big .card wrapping six sub-sections.
 */
export default function CollapsibleSection({
  title,
  actions,
  defaultCollapsed = false,
  alwaysExpanded = false,
  id,
  number,
  children,
}: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // The body of the card. When collapsed, we still render the children
  // (so React state inside, e.g. diagrams, stays mounted) but visually
  // hide them with CSS. This avoids expensive re-renders when the user
  // toggles back and forth.
  return (
    <section
      id={id}
      className={`card collapsible-section ${collapsed ? 'collapsible-section--collapsed' : ''}`}
      aria-expanded={!collapsed}
    >
      <div className="section-heading-row">
        <h2 className="section-heading mt-0">
          {number != null && <span className="section-num">{number}</span>}
          {title}
          {!alwaysExpanded && (
            <button
              type="button"
              className="collapsible-section__toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand section' : 'Collapse section'}
              title={collapsed ? 'Expand section' : 'Collapse section'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path
                  d={collapsed ? 'M3 5l4 4 4-4' : 'M3 9l4-4 4 4'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </button>
          )}
        </h2>
        {actions && <div className="section-heading-row__actions">{actions}</div>}
      </div>
      <div className="collapsible-section__body" hidden={collapsed}>
        {children}
      </div>
    </section>
  );
}
