import { useState, useEffect, useMemo } from 'react';
import type { Iteration, Rule, Cohort, ActionMapping } from '../types/campaign';
import { useAuthor } from '../hooks/AuthorContext';
import MermaidDiagram from './MermaidDiagram';
import EligibilityRulesTable from './EligibilityRulesTable';
import ActionRulesTable from './ActionRulesTable';
import ActionsMapperTable from './ActionsMapperTable';
import ValidationPanel from './ValidationPanel';
import TemplateChips from './TemplateChips';
import AuthorPanel from './AuthorPanel';
import FallbackChainDiagram from './FallbackChainDiagram';
import { explainIteration } from '../utils/explain';

interface Props {
  iteration: Iteration;
  actionsMapper?: Record<string, ActionMapping>;
  /** Optional campaign-level context — dates and campaign-wide default
   *  routing. Used by the validation panel and the fallback-chain diagram. */
  campaignContext?: { StartDate?: string; EndDate?: string; DefaultCommsRouting?: string };
}

type TabId = 'eligibility' | 'action' | 'actions-mapper' | 'rules-mapper';

export default function IterationDetail({ iteration, actionsMapper, campaignContext }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('eligibility');
  const { viewMode, updateIteration, working } = useAuthor();

  // The author-mode flow manages its own editors via AuthorPanel — it ignores
  // the current activeTab and shows the actions inline.
  const authorMode = viewMode === 'author';

  const filterRules = (iteration.IterationRules || [])
    .filter(r => r.Type === 'F')
    .sort((a, b) => a.Priority - b.Priority);

  const suppressionRules = (iteration.IterationRules || [])
    .filter(r => r.Type === 'S')
    .sort((a, b) => a.Priority - b.Priority);

  const redirectRules = (iteration.IterationRules || [])
    .filter(r => r.Type === 'R')
    .sort((a, b) => a.Priority - b.Priority);

  const xRules = (iteration.IterationRules || [])
    .filter(r => r.Type === 'X')
    .sort((a, b) => a.Priority - b.Priority);

  const yRules = (iteration.IterationRules || [])
    .filter(r => r.Type === 'Y')
    .sort((a, b) => a.Priority - b.Priority);

  const cohorts = [...(iteration.IterationCohorts || [])].sort((a, b) => (a.Priority ?? 999) - (b.Priority ?? 999));

  // Rule-editing drawer state (only used in author mode)
  const [editingRule, setEditingRule] = useState<{ index: number } | { new: true } | null>(null);

  // Listen for the "open new rule" event from AuthorPanel's "+ Add Rule" button.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setEditingRule({ new: true });
    window.addEventListener('campaign-explainer:open-new-rule', handler);
    return () => window.removeEventListener('campaign-explainer:open-new-rule', handler);
  }, []);

  const openEditRule = (originalIndex: number) => setEditingRule({ index: originalIndex });
  const closeEditor = () => setEditingRule(null);

  const saveRule = (rule: Rule, originalIndex: number | null) => {
    updateIteration(iteration.ID, (it) => {
      const rules = [...(it.IterationRules || [])];
      if (originalIndex === null) rules.push(rule);
      else rules[originalIndex] = rule;
      return { ...it, IterationRules: rules };
    });
    closeEditor();
  };
  const deleteRule = (index: number) => {
    updateIteration(iteration.ID, (it) => {
      const rules = [...(it.IterationRules || [])];
      rules.splice(index, 1);
      return { ...it, IterationRules: rules };
    });
    closeEditor();
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'eligibility', label: 'Eligibility Rules (F/S)' },
    { id: 'action', label: 'Action Rules (R/X/Y)' },
    { id: 'actions-mapper', label: 'ActionsMapper' },
  ];

  if (iteration.RulesMapper) {
    tabs.push({ id: 'rules-mapper', label: 'RulesMapper' });
  }

  // Plain-English summary of the whole iteration
  const iterationSentences = useMemo(() => explainIteration(iteration), [iteration]);

  return (
    <div className="card">
      {/* Iteration Summary */}
      <div className="mb-8">
        <div className="section-heading-row">
          <h2 className="section-heading mt-0">
            Iteration: {iteration.Name || iteration.ID}
          </h2>
          {authorMode && (
            <button
              type="button"
              className="btn btn--secondary btn--small section-heading-row__edit"
              onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'iteration' } }))}
              title="Edit iteration settings (Name, Date, Type, defaults, StatusText)"
            >
              Edit iteration settings
            </button>
          )}
        </div>

        {iterationSentences.length > 0 && (
          <div className="iteration-sentence">
            <div className="iteration-sentence__label">In plain English</div>
            {iterationSentences.map((s, i) => (
              <p key={i} className="iteration-sentence__line">{s}</p>
            ))}
          </div>
        )}

        <div className="data-grid">
          <div className="data-item data-item--blue">
            <div className="data-item__label">ID</div>
            <div className="data-item__value">{iteration.ID}</div>
          </div>
          <div className="data-item data-item--blue">
            <div className="data-item__label">Date</div>
            <div className="data-item__value">
              {fmtDate(iteration.IterationDate)}
              <TemplateChips text={iteration.IterationDate} />
            </div>
          </div>
          <div className="data-item data-item--blue">
            <div className="data-item__label">Type</div>
            <div className="data-item__value">{descIterType(iteration.Type)}</div>
          </div>
          <div className="data-item data-item--blue">
            <div className="data-item__label">Comms Type</div>
            <div className="data-item__value">{iteration.CommsType || '—'}</div>
          </div>
        </div>

        {iteration.StatusText && (
          <>
            <h3 className="sub-heading">Status Text</h3>
            <div className="data-grid data-grid--3">
              <div className="data-item data-item--green">
                <div className="data-item__label">Actionable</div>
                <div className="data-item__value">{iteration.StatusText.Actionable || '—'}</div>
              </div>
              <div className="data-item data-item--orange">
                <div className="data-item__label">Not Actionable</div>
                <div className="data-item__value">{iteration.StatusText.NotActionable || '—'}</div>
              </div>
              <div className="data-item data-item--red">
                <div className="data-item__label">Not Eligible</div>
                <div className="data-item__value">{iteration.StatusText.NotEligible || '—'}</div>
              </div>
            </div>
          </>
        )}

        <h3 className="sub-heading">Default Routing Paths</h3>
        <div className="data-grid data-grid--3">
          <div className="data-item data-item--blue">
            <div className="data-item__label">Actionable (R fallback)</div>
            <div className="data-item__value font-mono">{iteration.DefaultCommsRouting || '—'}</div>
          </div>
          <div className="data-item data-item--purple">
            <div className="data-item__label">Not Eligible (X fallback)</div>
            <div className="data-item__value font-mono">{iteration.DefaultNotEligibleRouting || '—'}</div>
          </div>
          <div className="data-item data-item--brown">
            <div className="data-item__label">Not Actionable (Y fallback)</div>
            <div className="data-item__value font-mono">{iteration.DefaultNotActionableRouting || '—'}</div>
          </div>
        </div>
      </div>

      {/* Validation Panel — always visible */}
      <div className="mb-8">
        <ValidationPanel iteration={iteration} campaign={campaignContext} />
      </div>

      {/* Cohort Table */}
      <div className="mb-8">
        <div className="section-heading-row">
          <h2 className="section-heading">
            Cohorts ({cohorts.length})
          </h2>
          {authorMode && (
            <button
              type="button"
              className="btn btn--secondary btn--small section-heading-row__edit"
              onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'cohorts' } }))}
              title="Manage cohorts — add, edit, or jump to the cohort editor"
            >
              Manage cohorts
            </button>
          )}
        </div>
        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>
          Evaluated in priority order. Person must be a member of a cohort to proceed to rule evaluation for that cohort.
        </p>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Cohort Label</th>
                <th>Cohort Group</th>
                <th>Virtual</th>
                <th>Positive Description</th>
                {authorMode && <th></th>}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c, i) => {
                const originalIndex = (iteration.IterationCohorts || []).indexOf(c);
                return (
                  <tr
                    key={i}
                    style={{cursor: authorMode ? 'pointer' : 'default'}}
                    onClick={authorMode && originalIndex >= 0 ? () => {
                      // AuthorPanel owns the cohort editor state — fire a custom event it listens to
                      window.dispatchEvent(new CustomEvent('campaign-explainer:open-cohort', { detail: { label: c.CohortLabel } }));
                    } : undefined}
                  >
                    <td>{c.Priority ?? '—'}</td>
                    <td className="font-mono">{c.CohortLabel}</td>
                    <td>{c.CohortGroup}</td>
                    <td>{c.Virtual === 'Y' ? <strong>Yes</strong> : 'No'}</td>
                    <td>{c.PositiveDescription || '—'}</td>
                    {authorMode && (
                      <td>
                        <button
                          type="button"
                          className="btn btn--small"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.dispatchEvent(new CustomEvent('campaign-explainer:open-cohort', { detail: { label: c.CohortLabel } }));
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 1: Eligibility Flow */}
      <div className="mb-8">
        <span className="badge badge--phase">Phase 1</span>
        <h2 style={{fontSize: 'var(--font-size-xl)', fontWeight: 700, marginTop: '0.5rem', marginBottom: '1rem'}}>Eligibility Flow — "Who is eligible?"</h2>
        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>
          For each cohort (by priority), the system checks: base eligibility (cohort membership) →
          Filter rules (F) by priority group → Suppression rules (S) by priority group.
          The best status across all cohorts becomes the final status.
        </p>
        <div className="mermaid-container">
          <MermaidDiagram code={buildEligibilityDiagram(filterRules, suppressionRules, cohorts)} />
        </div>
      </div>

      {/* Phase 2: Action Routing */}
      <div className="mb-8">
        <span className="badge badge--phase">Phase 2</span>
        <h2 style={{fontSize: 'var(--font-size-xl)', fontWeight: 700, marginTop: '0.5rem', marginBottom: '1rem'}}>Action Routing — "What happens next?"</h2>
        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>
          Based on the final status from Phase 1, the system selects which action rules to evaluate:
          <span className="badge badge--r" style={{marginLeft: '0.5rem', marginRight: '0.25rem'}}>R</span> if <strong>actionable</strong>
          <span className="badge badge--x" style={{marginLeft: '0.5rem', marginRight: '0.25rem'}}>X</span> if <strong>not eligible</strong>
          <span className="badge badge--y" style={{marginLeft: '0.5rem', marginRight: '0.25rem'}}>Y</span> if <strong>not actionable</strong>
          <br />
          All rules in a priority group must match for that group's CommsRouting to be used. First matching group wins. Otherwise, default routing applies.
        </p>
        <div className="mermaid-container">
          <MermaidDiagram code={buildActionRoutingDiagram(redirectRules, xRules, yRules, iteration)} />
        </div>

        <h3 className="sub-heading">Routing Resolution</h3>
        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>How CommsRouting strings resolve to actions via the ActionsMapper.</p>
        {buildRoutingResolution(redirectRules, xRules, yRules, iteration, actionsMapper || {})}

        <h3 className="sub-heading" style={{ marginTop: '1.5rem' }}>Fallback Chain</h3>
        <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>
          The full R / X / Y chain, read top-to-bottom: <em>first match wins</em>. Each link shows
          the priority group + rule names + CommsRouting code, with the resolved ActionType /
          description from the ActionsMapper. When no rule matches, the iteration default fires.
          When that's empty, the campaign default (R only) fires. When that's empty too, no
          action is returned.
        </p>
        <FallbackChainDiagram
          iteration={iteration}
          campaignDefault={campaignContext?.DefaultCommsRouting}
          actionsMapper={actionsMapper}
        />
      </div>

      {/* Tabbed Rule Tables */}
      <div>
        <div className="section-heading-row">
          <h2 className="section-heading mt-0">Rule Details</h2>
          {authorMode && (
            <>
              <button
                type="button"
                className="btn btn--secondary btn--small section-heading-row__edit"
                onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'rules' } }))}
                title="Open the rule manager — add new rules, see a summary by type"
              >
                Manage rules
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--small section-heading-row__edit"
                onClick={() => window.dispatchEvent(new CustomEvent('campaign-explainer:edit-section', { detail: { section: 'actions' } }))}
                title="Manage the ActionsMapper — add, edit, or audit your action definitions"
              >
                Manage actions
              </button>
            </>
          )}
        </div>

        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'eligibility' && (
            <EligibilityRulesTable
              filterRules={filterRules}
              suppressionRules={suppressionRules}
              allRulesInOrder={iteration.IterationRules}
              onEditRule={authorMode ? openEditRule : undefined}
            />
          )}
          {activeTab === 'action' && (
            <ActionRulesTable
              rRules={redirectRules}
              xRules={xRules}
              yRules={yRules}
              allRulesInOrder={iteration.IterationRules}
              onEditRule={authorMode ? openEditRule : undefined}
            />
          )}
          {activeTab === 'actions-mapper' && (
            <ActionsMapperTable
              mapper={actionsMapper || {}}
              onEditAction={authorMode ? (key) => {
                window.dispatchEvent(new CustomEvent('campaign-explainer:open-action', { detail: { key } }));
              } : undefined}
            />
          )}
          {activeTab === 'rules-mapper' && iteration.RulesMapper && (
            <div>
              <p style={{fontSize: 'var(--font-size-sm)', color: 'var(--grey-1)', marginBottom: '1rem'}}>Maps internal rule names to external-facing codes and text for display.</p>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mapper Key</th>
                      <th>Rule Names</th>
                      <th>Rule Code</th>
                      <th>Rule Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(iteration.RulesMapper).map(([key, entry]) => (
                      <tr key={key}>
                        <td className="font-mono">{key}</td>
                        <td>{(entry.RuleNames || []).map(n => <code key={n} className="code-inline" style={{marginRight: '4px'}}>{n}</code>)}</td>
                        <td>{entry.RuleCode || '—'}</td>
                        <td>{entry.RuleText || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Author panel — only renders in author mode. Manages its own editor drawer state
          (rule/cohort/action/metadata), and also bridges to custom events fired by the
          read-only tables above (cohort edit, action edit). */}
      {authorMode && (
        <AuthorPanel
          iteration={iteration}
          iterations={working?.Iterations}
          editingRule={editingRule}
          onCloseRuleEditor={closeEditor}
          onSaveRule={saveRule}
          onDeleteRule={deleteRule}
        />
      )}
    </div>
  );
}

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  const s = String(d);
  if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

function descIterType(t: string | undefined): string {
  const map: Record<string, string> = { A: 'Automatic (A)', M: 'Manual (M)', S: 'Scheduled (S)', O: 'On-demand (O)' };
  return map[t || ''] || t || '—';
}

function mesc(str: string | undefined | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/"/g, '#quot;')
    .replace(/\|/g, '#124;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\{/g, '#lbrace;')
    .replace(/\}/g, '#rbrace;')
    .replace(/\[/g, '#91;')
    .replace(/\]/g, '#93;')
    .replace(/\(/g, '#40;')
    .replace(/\)/g, '#41;');
}

function groupByPriority(rules: Rule[]): Record<number, Rule[]> {
  const groups: Record<number, Rule[]> = {};
  rules.forEach(r => {
    const p = r.Priority ?? 0;
    if (!groups[p]) groups[p] = [];
    groups[p].push(r);
  });
  return groups;
}

function buildEligibilityDiagram(filterRules: Rule[], suppressionRules: Rule[], cohorts: Cohort[]): string {
  let d = 'flowchart TD\n';
  d += `  START([" For each of ${cohorts.length} cohort${cohorts.length === 1 ? '' : 's'} by priority"])\n`;
  d += '  BASE{{"Base Eligibility Check\\nIs person in cohort?"}}\n';
  d += '  START --> BASE\n';
  d += '  BASE -- "No" --> NOT_ELIG_BASE["❌ not_eligible\\nnot in cohort"]\n';
  d += '  BASE -- "Yes" --> FILTER_START\n';

  const fGroups = groupByPriority(filterRules);
  const fKeys = Object.keys(fGroups).map(Number).sort((a, b) => a - b);

  if (fKeys.length === 0) {
    d += '  FILTER_START[["No Filter Rules"]] --> SUPP_START\n';
  } else {
    d += '  FILTER_START[["Filter Rules (F)"]]\n';
    fKeys.forEach((p, i) => {
      const nodeId = `F_P${p}`;
      const rules = fGroups[p];
      const names = rules.map(r => mesc(r.Name)).join('\\n');
      d += `  ${nodeId}{"[F] Priority ${p}\\n${names}"}\n`;
      d += `  ${i === 0 ? 'FILTER_START' : `F_P${fKeys[i - 1]}`} -- "pass" --> ${nodeId}\n`;
      d += `  ${nodeId} -- "matched" --> F_EXIT_${p}["❌ not_eligible"]\n`;
    });
    d += `  F_P${fKeys[fKeys.length - 1]} -- "pass" --> SUPP_START\n`;
  }

  const sGroups = groupByPriority(suppressionRules);
  const sKeys = Object.keys(sGroups).map(Number).sort((a, b) => a - b);

  if (sKeys.length === 0) {
    d += '  SUPP_START[["No Suppression Rules"]] --> ACTIONABLE\n';
  } else {
    d += '  SUPP_START[["Suppression Rules (S)"]]\n';
    sKeys.forEach((p, i) => {
      const nodeId = `S_P${p}`;
      const rules = sGroups[p];
      const names = rules.map(r => mesc(r.Name)).join('\\n');
      const hasStop = rules.some(r => r.RuleStop === true || r.RuleStop === 'Y');
      d += `  ${nodeId}{"[S] Priority ${p}\\n${names}${hasStop ? '\\n⛔ RuleStop' : ''}"}\n`;
      d += `  ${i === 0 ? 'SUPP_START' : `S_P${sKeys[i - 1]}`} -- "pass" --> ${nodeId}\n`;
      d += `  ${nodeId} -- "matched" --> S_EXIT_${p}["⚠️ not_actionable"]\n`;
    });
    d += `  S_P${sKeys[sKeys.length - 1]} -- "pass" --> ACTIONABLE\n`;
  }

  d += '  ACTIONABLE(["✅ actionable"])\n';
  d += '  style NOT_ELIG_BASE fill:#d81e05,color:#fff,stroke:#a31600\n';
  fKeys.forEach(p => {
    d += `  style F_EXIT_${p} fill:#d81e05,color:#fff,stroke:#a31600\n`;
    d += `  style F_P${p} fill:#fce1e0,stroke:#d81e05,color:#212b32\n`;
  });
  sKeys.forEach(p => {
    d += `  style S_EXIT_${p} fill:#e68300,color:#fff,stroke:#b36800\n`;
    d += `  style S_P${p} fill:#fff3e0,stroke:#e68300,color:#212b32\n`;
  });
  d += '  style ACTIONABLE fill:#007f3b,color:#fff,stroke:#00401e\n';
  d += '  style BASE fill:#005eb8,color:#fff,stroke:#003d78\n';

  return d;
}

function buildActionRoutingDiagram(rRules: Rule[], xRules: Rule[], yRules: Rule[], iteration: Iteration): string {
  let d = 'flowchart TD\n';
  d += '  STATUS{{"Final Status\\nfrom Phase 1"}}\n';
  d += '  STATUS -- "actionable" --> R_PATH\n';
  d += '  STATUS -- "not_eligible" --> X_PATH\n';
  d += '  STATUS -- "not_actionable" --> Y_PATH\n';

  d += buildActionPath('R', rRules, iteration.DefaultCommsRouting, 'Redirect Rules', '#005eb8', '#e0edf5');
  d += buildActionPath('X', xRules, iteration.DefaultNotEligibleRouting, 'Not-Eligible Action Rules', '#7C2855', '#f5e0eb');
  d += buildActionPath('Y', yRules, iteration.DefaultNotActionableRouting, 'Not-Actionable Action Rules', '#8a6d3b', '#f5eee0');
  d += '  style STATUS fill:#005eb8,color:#fff,stroke:#003d78\n';

  return d;
}

function buildActionPath(type: string, rules: Rule[], defaultRouting: string | undefined, label: string, color: string, bgColor: string): string {
  let d = '';
  const pathId = `${type}_PATH`;
  const groups = groupByPriority(rules);
  const pKeys = Object.keys(groups).map(Number).sort((a, b) => a - b);

  d += `  ${pathId}[["[${type}] ${label}"]]\n`;
  d += `  style ${pathId} fill:${bgColor},stroke:${color},color:#212b32\n`;

  if (pKeys.length === 0) {
    d += `  ${pathId} --> ${type}_DEFAULT["Default: ${mesc(defaultRouting || '—')}"]\n`;
    d += `  style ${type}_DEFAULT fill:${bgColor},stroke:${color},color:#212b32\n`;
  } else {
    pKeys.forEach((p, i) => {
      const nodeId = `${type}_P${p}`;
      const ruleGroup = groups[p];
      const names = ruleGroup.map(r => mesc(r.Name)).join('\\n');
      const routing = mesc(ruleGroup[0].CommsRouting || '—');
      d += `  ${nodeId}{"Priority ${p}\\n${names}\\nAll must match"}\n`;
      d += `  style ${nodeId} fill:${bgColor},stroke:${color},color:#212b32\n`;
      d += `  ${i === 0 ? pathId : `${type}_P${pKeys[i - 1]}`} --> ${nodeId}\n`;
      d += `  ${nodeId} -- "all match" --> ${type}_MATCHED_${p}["Route: ${routing}"]\n`;
      d += `  style ${type}_MATCHED_${p} fill:${color},color:#fff,stroke:${color}\n`;
    });
    d += `  ${type}_P${pKeys[pKeys.length - 1]} -- "no match" --> ${type}_DEFAULT["Default: ${mesc(defaultRouting || '—')}"]\n`;
    d += `  style ${type}_DEFAULT fill:${bgColor},stroke:${color},color:#212b32\n`;
  }

  return d;
}

function buildRoutingResolution(rRules: Rule[], xRules: Rule[], yRules: Rule[], iteration: Iteration, mapper: Record<string, ActionMapping>) {
  const sections = [
    { type: 'R', label: 'Actionable → R Rules', rules: rRules, defaultRouting: iteration.DefaultCommsRouting },
    { type: 'X', label: 'Not Eligible → X Rules', rules: xRules, defaultRouting: iteration.DefaultNotEligibleRouting },
    { type: 'Y', label: 'Not Actionable → Y Rules', rules: yRules, defaultRouting: iteration.DefaultNotActionableRouting },
  ];

  const colorMap: Record<string, string> = { R: '#005eb8', X: '#7C2855', Y: '#8a6d3b' };

  return (
    <div className="space-y-4">
      {sections.map(sec => (
        <div key={sec.type} className="border-2 border-[#d8dde0] rounded p-4" style={{ borderColor: colorMap[sec.type] }}>
          <div className="font-semibold mb-3">
            <span className={`inline-block text-white px-2 py-0.5 text-xs font-bold mr-2 ${sec.type === 'R' ? 'bg-[#005eb8]' : sec.type === 'X' ? 'bg-[#7C2855]' : 'bg-[#8a6d3b]'}`}>
              {sec.type}
            </span>
            {sec.label}
          </div>

          <div className="mb-3">
            <span className="text-sm text-[#4c6272]">Default routing → </span>
            <code className="bg-[#e8edee] px-2 py-1 text-sm">{sec.defaultRouting || '—'}</code>
            {resolveRoutingHtml(sec.defaultRouting, mapper)}
          </div>

          {Object.entries(groupByPriority(sec.rules)).map(([p, rules]) => {
            const routing = rules[0].CommsRouting;
            if (!routing) return null;
            return (
              <div key={p} className="mb-2">
                <span className="text-sm text-[#4c6272]">Priority {p} ({rules.map(r => r.Name).join(', ')}) → </span>
                <code className="bg-[#e8edee] px-2 py-1 text-sm">{routing}</code>
                {resolveRoutingHtml(routing, mapper)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function resolveRoutingHtml(commsStr: string | undefined, mapper: Record<string, ActionMapping>) {
  if (!commsStr) return null;
  return (
    <div className="ml-4 mt-1">
      {commsStr.split('|').map(code => {
        const trimmed = code.trim();
        const action = mapper[trimmed];
        return (
          <span key={trimmed} className="inline-block bg-[#e8edee] border-l-2 border-[#005eb8] px-2 py-1 text-xs mr-2 my-1">
            <strong>{trimmed}</strong> →
            {action ? (
              <>
                {' '}{action.ExternalRoutingCode || ''} / {action.ActionType || ''}
                {action.ActionDescription ? ` / ${action.ActionDescription}` : ''}
                {action.UrlLink && <a href="#" className="ml-1 text-[#005eb8]">{action.UrlLabel || action.UrlLink}</a>}
              </>
            ) : (
              <span className="text-[#d81e05] ml-1">not found in ActionsMapper</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
