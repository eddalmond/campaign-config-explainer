import { useMemo } from 'react';
import type { CampaignConfig } from '../types/campaign';
import Drawer from './Drawer';
import {
  type ReferenceKind,
  type CrossReferenceResult,
  findAttributeReferences,
  findRoutingReferences,
  findCohortReferences,
} from '../utils/crossReferences';

interface Props {
  config: CampaignConfig;
  kind: ReferenceKind;
  /** The thing being searched for. */
  query: string;
  /** For attribute kind only. */
  level?: string;
  target?: string;
  /** Optional callback when a rule reference is clicked — used to deep-link
   *  into the rule editor. */
  onOpenRule?: (iterationId: string, ruleIndex: number) => void;
  onClose: () => void;
  /** Current iteration ID — rules in this iteration get the clickable style. */
  currentIterationId?: string;
}

const KIND_LABEL: Record<ReferenceKind, { singular: string; plural: string }> = {
  attribute: { singular: 'attribute', plural: 'attributes' },
  routing: { singular: 'routing code', plural: 'routing codes' },
  cohort: { singular: 'cohort', plural: 'cohorts' },
};

/**
 * Drawer showing every reference to a given attribute, routing code,
 * or cohort across all iterations of a campaign. Each reference is
 * clickable and deep-links back to the rule's edit drawer.
 */
export default function CrossReferencesDrawer({
  config, kind, query, level, target, onOpenRule, onClose,
}: Props) {
  const result: CrossReferenceResult = useMemo(() => {
    if (kind === 'attribute') return findAttributeReferences(config, query, level, target);
    if (kind === 'routing')   return findRoutingReferences(config, query);
    return findCohortReferences(config, query);
  }, [config, kind, query, level, target]);

  const totalRefs = result.totalRules + result.totalActions;
  const label = KIND_LABEL[kind];

  return (
    <Drawer
      open
      onClose={onClose}
      width={620}
      title={`Where is this ${label.singular} used?`}
      subtitle={
        <>
          <code className="code-inline">{result.displayName}</code>
          {' · '}
          {totalRefs === 0
            ? 'no references'
            : `${result.totalRules} rule${result.totalRules === 1 ? '' : 's'}${result.totalActions > 0 ? ` + ${result.totalActions} action${result.totalActions === 1 ? '' : 's'}` : ''}`}
        </>
      }
    >
      {totalRefs === 0 ? (
        <div className="cross-refs__empty">
          <strong><code className="code-inline">{result.displayName}</code></strong> is not referenced by any rule or action in this campaign.
        </div>
      ) : (
        <>
          {/* Per-iteration summary chips */}
          {result.byIteration.length > 0 && (
            <div className="cross-refs__iter-summary">
              {result.byIteration.map(it => (
                <span
                  key={it.iterationName}
                  className={`cross-refs__iter-chip ${it.ruleCount + it.actionCount > 0 ? 'cross-refs__iter-chip--active' : 'cross-refs__iter-chip--empty'}`}
                  title={it.ruleCount + it.actionCount > 0 ? `${it.ruleCount} rule(s), ${it.actionCount} action(s)` : 'no references'}
                >
                  {it.iterationName}
                  {it.ruleCount + it.actionCount > 0 && (
                    <span className="cross-refs__iter-count">
                      {it.ruleCount + it.actionCount > 0 ? it.ruleCount + it.actionCount : ''}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Action mapper entries (routing kind only) */}
          {result.actions.length > 0 && (
            <section className="cross-refs__section">
              <h3 className="cross-refs__section-title">
                ActionsMapper ({result.actions.length})
              </h3>
              <ul className="cross-refs__list">
                {result.actions.map((a, i) => (
                  <li key={`${a.iterationId}-${a.routingKey}-${i}`} className="cross-refs__item cross-refs__item--action">
                    <div className="cross-refs__item-header">
                      <span className="badge">Action</span>
                      <span className="cross-refs__item-name font-mono">{a.routingKey}</span>
                      {a.actionType && <span className="cross-refs__item-meta">{a.actionType}</span>}
                    </div>
                    {a.externalRoutingCode && (
                      <div className="cross-refs__item-context">→ {a.externalRoutingCode}</div>
                    )}
                    {a.actionDescription && (
                      <div className="cross-refs__item-context">{a.actionDescription}</div>
                    )}
                    <div className="cross-refs__item-loc">in iteration: {a.iterationName}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Rules */}
          {result.rules.length > 0 && (
            <section className="cross-refs__section">
              <h3 className="cross-refs__section-title">
                Rules ({result.rules.length})
              </h3>
              <ul className="cross-refs__list">
                {result.rules.map(r => (
                  <li
                    key={`${r.iterationId}-${r.ruleIndex}`}
                    className={`cross-refs__item cross-refs__item--rule cross-refs__item--clickable${onOpenRule ? '' : ' cross-refs__item--no-link'}`}
                    onClick={onOpenRule ? () => onOpenRule(r.iterationId, r.ruleIndex) : undefined}
                  >
                    <div className="cross-refs__item-header">
                      <span className={`badge badge--${r.ruleType.toLowerCase()}`}>{r.ruleType}</span>
                      <span className="cross-refs__item-name">{r.ruleName}</span>
                      <span className="cross-refs__item-meta">via {r.via}</span>
                    </div>
                    <div className="cross-refs__item-context">{r.context}</div>
                    <div className="cross-refs__item-loc">
                      in iteration: {r.iterationName} · rule #{r.ruleIndex + 1}
                      {onOpenRule && <span className="cross-refs__item-jump">↗ jump to rule</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
      </div>
    </Drawer>
  );
}
