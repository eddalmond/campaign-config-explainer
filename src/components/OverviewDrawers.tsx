import type { Iteration } from '../types/campaign';
import Drawer from './Drawer';

interface CohortsOverviewProps {
  iteration: Iteration;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (label: string) => void;
}

export function CohortsOverviewDrawer({ iteration, onClose, onAdd, onEdit }: CohortsOverviewProps) {
  const cohorts = [...(iteration.IterationCohorts || [])].sort((a, b) => (a.Priority ?? 0) - (b.Priority ?? 0));
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title="Cohorts"
      subtitle={`${cohorts.length} cohort${cohorts.length === 1 ? '' : 's'} in this iteration`}
    >
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        Cohorts are evaluated in priority order. A person must be a member of a cohort for its
        filter (F) and suppression (S) rules to be evaluated. Click a row to edit, or add a new one.
      </p>
      <div className="overview-list">
        {cohorts.length === 0 ? (
          <div className="overview-list__empty">No cohorts defined yet.</div>
        ) : (
          cohorts.map(c => (
            <button
              key={c.CohortLabel}
              type="button"
              className="overview-list__item"
              onClick={() => onEdit(c.CohortLabel)}
            >
              <div className="overview-list__primary">
                <span className="overview-list__priority">P{c.Priority ?? 0}</span>
                <span className="overview-list__label font-mono">{c.CohortLabel}</span>
                {c.Virtual === 'Y' && <span className="badge">Virtual</span>}
              </div>
              <div className="overview-list__secondary">
                {c.CohortGroup || '—'} · {c.PositiveDescription || 'No positive description'}
              </div>
            </button>
          ))
        )}
      </div>
      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
        <button type="button" className="btn btn--primary" onClick={onAdd}>+ Add Cohort</button>
      </div>
    </Drawer>
  );
}

interface RulesOverviewProps {
  iteration: Iteration;
  onClose: () => void;
  onAddRule: () => void;
}

const RULE_TYPE_INFO: Record<string, { label: string; tone: 'r' | 'x' | 'y' | 'f' | 's' }> = {
  F: { label: 'Filter — exclude from cohort if matched', tone: 'f' },
  S: { label: 'Suppression — short-circuit eligibility', tone: 's' },
  R: { label: 'Redirect — route to action', tone: 'r' },
  X: { label: 'Not eligible — fallback action', tone: 'x' },
  Y: { label: 'Not actionable — fallback action', tone: 'y' },
};

export function RulesOverviewDrawer({ iteration, onClose, onAddRule }: RulesOverviewProps) {
  const rules = iteration.IterationRules || [];
  const grouped: Record<string, number> = {};
  for (const r of rules) grouped[r.Type] = (grouped[r.Type] || 0) + 1;
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title="Rule Details"
      subtitle={`${rules.length} rule${rules.length === 1 ? '' : 's'} in this iteration`}
    >
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        The detailed rule tables (with editable rows) are on the main page below — this is a quick
        summary so you can jump straight to "add new". New rules can also be added inline from the
        rule tables themselves.
      </p>
      <div className="overview-list overview-list--compact">
        {(['F', 'S', 'R', 'X', 'Y'] as const).map(t => (
          <div key={t} className="overview-list__item overview-list__item--readonly">
            <div className="overview-list__primary">
              <span className={`badge badge--${RULE_TYPE_INFO[t].tone}`}>{t}</span>
              <span className="overview-list__label">{RULE_TYPE_INFO[t].label}</span>
            </div>
            <div className="overview-list__secondary">
              {grouped[t] || 0} rule{(grouped[t] || 0) === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
        <button type="button" className="btn btn--primary" onClick={onAddRule}>+ Add Rule</button>
      </div>
    </Drawer>
  );
}

interface ActionsOverviewProps {
  iteration: Iteration;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (key: string) => void;
}

export function ActionsOverviewDrawer({ iteration, onClose, onAdd, onEdit }: ActionsOverviewProps) {
  const mapper = iteration.ActionsMapper || {};
  const keys = Object.keys(mapper);
  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title="ActionsMapper"
      subtitle={`${keys.length} action${keys.length === 1 ? '' : 's'} mapped`}
    >
      <p className="form-hint" style={{ marginBottom: '1rem' }}>
        Maps internal <code>CommsRouting</code> codes to external-facing action types
        (InfoText, ButtonWithAuthLink, …). Each code in your R/X/Y rules must be
        present here, or the validation panel will flag it.
      </p>
      <div className="overview-list">
        {keys.length === 0 ? (
          <div className="overview-list__empty">No actions mapped yet.</div>
        ) : (
          keys.map(k => {
            const m = mapper[k];
            return (
              <button
                key={k}
                type="button"
                className="overview-list__item"
                onClick={() => onEdit(k)}
              >
                <div className="overview-list__primary">
                  <span className="overview-list__label font-mono">{k}</span>
                  <span className="badge">{m.ActionType || '—'}</span>
                </div>
                <div className="overview-list__secondary">
                  {m.ExternalRoutingCode || '—'} · {m.ActionDescription || 'No description'}
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
        <button type="button" className="btn btn--primary" onClick={onAdd}>+ Add Action</button>
      </div>
    </Drawer>
  );
}
