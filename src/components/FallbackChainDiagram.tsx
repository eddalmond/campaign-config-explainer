import type { Iteration, Rule, ActionMapping } from '../types/campaign';

interface Props {
  iteration: Iteration;
  campaignDefault?: string;
  actionsMapper?: Record<string, ActionMapping>;
}

/**
 * Three-column visual of the R / X / Y routing fallback chains.
 *
 * For each rule type, the chain (top to bottom) is:
 *   rule at priority X (if matches) → rule at priority Y (if matches) → ...
 *   → iteration default
 *   → campaign default
 *   → (no action)
 *
 * The "first matching priority group wins" rule means the chain is read
 * top-to-bottom: the topmost match is what fires. Visualised as a
 * vertical breadcrumb with a downward arrow between each link.
 *
 * The right-hand column shows the ActionType / ExternalRoutingCode /
 * description from the ActionsMapper so the user can see what each
 * routing code actually does — answering the implicit "what does
 * CommsRouting 'X' mean?" question without leaving the page.
 */
export default function FallbackChainDiagram({ iteration, campaignDefault, actionsMapper }: Props) {
  const chains: { type: 'R' | 'X' | 'Y'; label: string; defaultRouting: string | undefined; bg: string; border: string; tone: string }[] = [
    { type: 'R', label: 'Actionable', defaultRouting: iteration.DefaultCommsRouting, bg: '#e0edf5', border: '#005eb8', tone: 'r' },
    { type: 'X', label: 'Not eligible', defaultRouting: iteration.DefaultNotEligibleRouting, bg: '#f5e0eb', border: '#7C2855', tone: 'x' },
    { type: 'Y', label: 'Not actionable', defaultRouting: iteration.DefaultNotActionableRouting, bg: '#f5eee0', border: '#8a6d3b', tone: 'y' },
  ];

  return (
    <div className="fallback-chain">
      {chains.map(chain => (
        <Chain key={chain.type} {...chain} iteration={iteration} campaignDefault={campaignDefault} actionsMapper={actionsMapper} />
      ))}
    </div>
  );
}

function Chain({
  type, label, defaultRouting, bg, border, tone,
  iteration, campaignDefault, actionsMapper,
}: {
  type: 'R' | 'X' | 'Y';
  label: string;
  defaultRouting: string | undefined;
  bg: string;
  border: string;
  tone: string;
  iteration: Iteration;
  campaignDefault?: string;
  actionsMapper?: Record<string, ActionMapping>;
}) {
  // Group rules of this type by priority, ordered by priority asc.
  // The first matching priority group wins, so we read top-to-bottom.
  const ruleGroups = new Map<number, Rule[]>();
  for (const r of (iteration.IterationRules || []).filter(r => r.Type === type)) {
    const p = r.Priority ?? 0;
    const list = ruleGroups.get(p) ?? [];
    list.push(r);
    ruleGroups.set(p, list);
  }
  const sortedPriorities = [...ruleGroups.keys()].sort((a, b) => a - b);

  return (
    <div className={`fallback-chain__chain fallback-chain__chain--${tone}`}>
      <div className="fallback-chain__header" style={{ borderColor: border, backgroundColor: bg }}>
        <span className={`badge badge--${tone}`}>{type}</span>
        <span className="fallback-chain__header-label">{label}</span>
      </div>
      <ol className="fallback-chain__list">
        {sortedPriorities.length === 0 && (
          <li className="fallback-chain__item fallback-chain__item--empty">No {type} rules</li>
        )}
        {sortedPriorities.map((p, i) => {
          const grp = ruleGroups.get(p)!;
          const routing = grp[0].CommsRouting;
          return (
            <li key={p} className="fallback-chain__item" style={{ borderLeftColor: border }}>
              <div className="fallback-chain__item-header">
                <span className="fallback-chain__rank">#{i + 1}</span>
                <span className="fallback-chain__priority">priority {p}</span>
                {i === 0 && <span className="fallback-chain__tried">tried first</span>}
              </div>
              <div className="fallback-chain__names">
                {grp.map(r => r.Name).join(' AND ')}
              </div>
              {routing ? (
                <RoutingDetail routing={routing} actionsMapper={actionsMapper} />
              ) : (
                <span className="fallback-chain__no-routing">⚠ no CommsRouting (will not fire)</span>
              )}
              {i < sortedPriorities.length - 1 && <div className="fallback-chain__arrow" aria-hidden="true">↓ no match</div>}
            </li>
          );
        })}
        {/* Iteration-level default — the "soft" fallback */}
        <li className="fallback-chain__item fallback-chain__item--default" style={{ borderLeftColor: border }}>
          <div className="fallback-chain__item-header">
            <span className="fallback-chain__rank">↓</span>
            <span className="fallback-chain__priority">iteration default</span>
            <code className="code-inline">{`Default${type === 'R' ? 'CommsRouting' : type === 'X' ? 'NotEligibleRouting' : 'NotActionableRouting'}`}</code>
          </div>
          {defaultRouting
            ? <RoutingDetail routing={defaultRouting} actionsMapper={actionsMapper} />
            : <span className="fallback-chain__no-routing">— not set (empty string)</span>
          }
        </li>
        {/* Campaign-level default — the "hard" fallback */}
        {type === 'R' && (
          <li className="fallback-chain__item fallback-chain__item--default fallback-chain__item--campaign" style={{ borderLeftColor: border }}>
            <div className="fallback-chain__item-header">
              <span className="fallback-chain__rank">↓</span>
              <span className="fallback-chain__priority">campaign default</span>
              <code className="code-inline">DefaultCommsRouting</code>
            </div>
            {campaignDefault
              ? <RoutingDetail routing={campaignDefault} actionsMapper={actionsMapper} />
              : <span className="fallback-chain__no-routing">— not set (empty string)</span>
            }
          </li>
        )}
        <li className="fallback-chain__item fallback-chain__item--end" style={{ borderLeftColor: border }}>
          <span className="fallback-chain__rank">→</span>
          <span>no action returned</span>
        </li>
      </ol>
    </div>
  );
}

function RoutingDetail({ routing, actionsMapper }: { routing: string; actionsMapper?: Record<string, ActionMapping> }) {
  const codes = routing.split('|').map(s => s.trim()).filter(Boolean);
  return (
    <div className="fallback-chain__routing">
      <span className="fallback-chain__routing-codes">
        CommsRouting: {codes.map((c, i) => (
          <span key={c}>
            <code className="code-inline fallback-chain__code">{c}</code>
            {i < codes.length - 1 && <span className="fallback-chain__pipe">|</span>}
          </span>
        ))}
      </span>
      {actionsMapper && codes.length > 0 && (
        <ul className="fallback-chain__action-list">
          {codes.map(c => {
            const m = actionsMapper[c];
            if (!m) {
              return <li key={c} className="fallback-chain__action-missing">⚠ "{c}" not in ActionsMapper</li>;
            }
            return (
              <li key={c} className="fallback-chain__action">
                <span className="fallback-chain__action-type">{m.ActionType || '—'}</span>
                {m.ExternalRoutingCode && (
                  <span className="fallback-chain__action-ext">({m.ExternalRoutingCode})</span>
                )}
                {m.ActionDescription && (
                  <span className="fallback-chain__action-desc">— {m.ActionDescription}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
