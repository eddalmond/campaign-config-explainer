import { useState } from 'react';
import type { Iteration, Rule, Cohort, ActionMapping } from '../types/campaign';
import MermaidDiagram from './MermaidDiagram';
import EligibilityRulesTable from './EligibilityRulesTable';
import ActionRulesTable from './ActionRulesTable';
import ActionsMapperTable from './ActionsMapperTable';

interface Props {
  iteration: Iteration;
  actionsMapper?: Record<string, ActionMapping>;
}

type TabId = 'eligibility' | 'action' | 'actions-mapper' | 'rules-mapper';

export default function IterationDetail({ iteration, actionsMapper }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('eligibility');

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

  const tabs: { id: TabId; label: string }[] = [
    { id: 'eligibility', label: 'Eligibility Rules (F/S)' },
    { id: 'action', label: 'Action Rules (R/X/Y)' },
    { id: 'actions-mapper', label: 'ActionsMapper' },
  ];

  if (iteration.RulesMapper) {
    tabs.push({ id: 'rules-mapper', label: 'RulesMapper' });
  }

  return (
    <div className="bg-white border border-[#d8dde0] p-6">
      {/* Iteration Summary */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mt-0 mb-4 border-b-3 border-[#005eb8] pb-2">
          Iteration: {iteration.Name || iteration.ID}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">ID</div>
            <div className="font-semibold mt-1">{iteration.ID}</div>
          </div>
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Date</div>
            <div className="font-semibold mt-1">{fmtDate(iteration.IterationDate)}</div>
          </div>
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Type</div>
            <div className="font-semibold mt-1">{descIterType(iteration.Type)}</div>
          </div>
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Comms Type</div>
            <div className="font-semibold mt-1">{iteration.CommsType || '—'}</div>
          </div>
        </div>

        {iteration.StatusText && (
          <>
            <h3 className="text-lg font-semibold mt-6 mb-3">Status Text</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#007f3b]">
                <div className="text-xs uppercase tracking-wide text-[#4c6272]">Actionable</div>
                <div className="font-semibold mt-1">{iteration.StatusText.Actionable || '—'}</div>
              </div>
              <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#e68300]">
                <div className="text-xs uppercase tracking-wide text-[#4c6272]">Not Actionable</div>
                <div className="font-semibold mt-1">{iteration.StatusText.NotActionable || '—'}</div>
              </div>
              <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#d81e05]">
                <div className="text-xs uppercase tracking-wide text-[#4c6272]">Not Eligible</div>
                <div className="font-semibold mt-1">{iteration.StatusText.NotEligible || '—'}</div>
              </div>
            </div>
          </>
        )}

        <h3 className="text-lg font-semibold mt-6 mb-3">Default Routing Paths</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#005eb8]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Actionable (R fallback)</div>
            <div className="font-mono mt-1">{iteration.DefaultCommsRouting || '—'}</div>
          </div>
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#7C2855]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Not Eligible (X fallback)</div>
            <div className="font-mono mt-1">{iteration.DefaultNotEligibleRouting || '—'}</div>
          </div>
          <div className="bg-[#f0f4f5] p-3 border-l-4 border-[#8a6d3b]">
            <div className="text-xs uppercase tracking-wide text-[#4c6272]">Not Actionable (Y fallback)</div>
            <div className="font-mono mt-1">{iteration.DefaultNotActionableRouting || '—'}</div>
          </div>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mt-0 mb-4 border-b-3 border-[#005eb8] pb-2">
          Cohorts ({cohorts.length})
        </h2>
        <p className="text-sm text-[#4c6272] mb-4">
          Evaluated in priority order. Person must be a member of a cohort to proceed to rule evaluation for that cohort.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#005eb8] text-white">
                <th className="p-2 text-left font-semibold uppercase text-xs">Priority</th>
                <th className="p-2 text-left font-semibold uppercase text-xs">Cohort Label</th>
                <th className="p-2 text-left font-semibold uppercase text-xs">Cohort Group</th>
                <th className="p-2 text-left font-semibold uppercase text-xs">Virtual</th>
                <th className="p-2 text-left font-semibold uppercase text-xs">Positive Description</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c, i) => (
                <tr key={i} className="border-b border-[#d8dde0] hover:bg-[#f0f4f5]">
                  <td className="p-2">{c.Priority ?? '—'}</td>
                  <td className="p-2 font-mono">{c.CohortLabel}</td>
                  <td className="p-2">{c.CohortGroup}</td>
                  <td className="p-2">{c.Virtual === 'Y' ? <strong>Yes</strong> : 'No'}</td>
                  <td className="p-2">{c.PositiveDescription || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase 1: Eligibility Flow */}
      <div className="mb-8">
        <span className="inline-block bg-[#005eb8] text-white px-3 py-1 text-xs font-bold uppercase tracking-wide mb-2">
          Phase 1
        </span>
        <h2 className="text-xl font-bold mt-2 mb-4">Eligibility Flow — "Who is eligible?"</h2>
        <p className="text-sm text-[#4c6272] mb-4">
          For each cohort (by priority), the system checks: base eligibility (cohort membership) →
          Filter rules (F) by priority group → Suppression rules (S) by priority group.
          The best status across all cohorts becomes the final status.
        </p>
        <div className="bg-white border border-[#d8dde0] p-4 overflow-x-auto">
          <MermaidDiagram code={buildEligibilityDiagram(filterRules, suppressionRules, cohorts)} />
        </div>
      </div>

      {/* Phase 2: Action Routing */}
      <div className="mb-8">
        <span className="inline-block bg-[#005eb8] text-white px-3 py-1 text-xs font-bold uppercase tracking-wide mb-2">
          Phase 2
        </span>
        <h2 className="text-xl font-bold mt-2 mb-4">Action Routing — "What happens next?"</h2>
        <p className="text-sm text-[#4c6272] mb-4">
          Based on the final status from Phase 1, the system selects which action rules to evaluate:
          <span className="inline-block bg-[#005eb8] text-white px-2 py-0.5 text-xs font-bold ml-2 mr-1">R</span> if <strong>actionable</strong>
          <span className="inline-block bg-[#7C2855] text-white px-2 py-0.5 text-xs font-bold ml-2 mr-1">X</span> if <strong>not eligible</strong>
          <span className="inline-block bg-[#8a6d3b] text-white px-2 py-0.5 text-xs font-bold ml-2 mr-1">Y</span> if <strong>not actionable</strong>
          <br />
          All rules in a priority group must match for that group's CommsRouting to be used. First matching group wins. Otherwise, default routing applies.
        </p>
        <div className="bg-white border border-[#d8dde0] p-4 overflow-x-auto">
          <MermaidDiagram code={buildActionRoutingDiagram(redirectRules, xRules, yRules, iteration)} />
        </div>
        
        {/* Routing Resolution */}
        <h3 className="text-lg font-semibold mt-6 mb-3">Routing Resolution</h3>
        <p className="text-sm text-[#4c6272] mb-4">How CommsRouting strings resolve to actions via the ActionsMapper.</p>
        {buildRoutingResolution(redirectRules, xRules, yRules, iteration, actionsMapper || {})}
      </div>

      {/* Tabbed Rule Tables */}
      <div>
        <h2 className="text-xl font-bold mt-0 mb-4 border-b-3 border-[#005eb8] pb-2">Rule Details</h2>
        
        <div className="flex gap-0 border-b-3 border-[#005eb8]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 font-semibold text-sm border border-[#d8dde0] border-b-none -mb-px ${
                activeTab === tab.id
                  ? 'bg-white text-[#005eb8] border-[#005eb8] border-b-white mb-[-3px]'
                  : 'bg-[#e8edee] text-[#4c6272] hover:bg-[#f0f4f5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 border border-[#d8dde0] border-t-0">
          {activeTab === 'eligibility' && (
            <EligibilityRulesTable filterRules={filterRules} suppressionRules={suppressionRules} />
          )}
          {activeTab === 'action' && (
            <ActionRulesTable rRules={redirectRules} xRules={xRules} yRules={yRules} />
          )}
          {activeTab === 'actions-mapper' && (
            <ActionsMapperTable mapper={actionsMapper || {}} />
          )}
          {activeTab === 'rules-mapper' && iteration.RulesMapper && (
            <div>
              <p className="text-sm text-[#4c6272] mb-4">Maps internal rule names to external-facing codes and text for display.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#005eb8] text-white">
                    <th className="p-2 text-left font-semibold uppercase text-xs">Mapper Key</th>
                    <th className="p-2 text-left font-semibold uppercase text-xs">Rule Names</th>
                    <th className="p-2 text-left font-semibold uppercase text-xs">Rule Code</th>
                    <th className="p-2 text-left font-semibold uppercase text-xs">Rule Text</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(iteration.RulesMapper).map(([key, entry]) => (
                    <tr key={key} className="border-b border-[#d8dde0] hover:bg-[#f0f4f5]">
                      <td className="p-2 font-mono">{key}</td>
                      <td className="p-2">{(entry.RuleNames || []).map(n => <code key={n} className="mr-1">{n}</code>)}</td>
                      <td className="p-2">{entry.RuleCode || '—'}</td>
                      <td className="p-2">{entry.RuleText || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
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

function buildEligibilityDiagram(filterRules: Rule[], suppressionRules: Rule[], _cohorts: Cohort[]): string {
  let d = 'flowchart TD\n';
  d += '  START([" For each Cohort by priority"])\n';
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