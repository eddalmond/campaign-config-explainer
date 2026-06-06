import { useMemo, useState } from 'react';
import type { Iteration } from '../types/campaign';
import { summarise, validateIteration, type Severity } from '../utils/validation';

interface Props {
  iteration: Iteration;
}

const SEVERITY_ORDER: Severity[] = ['error', 'warning', 'info'];

export default function ValidationPanel({ iteration }: Props) {
  const issues = useMemo(() => validateIteration(iteration), [iteration]);
  const summary = useMemo(() => summarise(issues), [issues]);
  const [activeFilter, setActiveFilter] = useState<Severity | 'all'>('all');

  const visible = activeFilter === 'all'
    ? issues
    : issues.filter(i => i.severity === activeFilter);

  const hasIssues = issues.length > 0;

  return (
    <div className="card validation-panel">
      <div className="validation-panel__header">
        <h2 className="section-heading mt-0">Validation</h2>
        <div className="validation-panel__summary" aria-live="polite">
          <span className={`badge badge--error ${summary.errors === 0 ? 'badge--muted' : ''}`}>
            {summary.errors} {summary.errors === 1 ? 'error' : 'errors'}
          </span>
          <span className={`badge badge--warning ${summary.warnings === 0 ? 'badge--muted' : ''}`}>
            {summary.warnings} {summary.warnings === 1 ? 'warning' : 'warnings'}
          </span>
          <span className={`badge badge--info ${summary.infos === 0 ? 'badge--muted' : ''}`}>
            {summary.infos} {summary.infos === 1 ? 'info' : 'info'}
          </span>
        </div>
      </div>

      <div className="validation-panel__filters" role="tablist" aria-label="Filter issues by severity">
        <button
          type="button"
          role="tab"
          aria-selected={activeFilter === 'all'}
          className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({issues.length})
        </button>
        {SEVERITY_ORDER.map(sev => {
          const count = summary[`${sev}s` as 'errors' | 'warnings' | 'infos'];
          return (
            <button
              key={sev}
              type="button"
              role="tab"
              aria-selected={activeFilter === sev}
              className={`tab-btn ${activeFilter === sev ? 'active' : ''}`}
              onClick={() => setActiveFilter(sev)}
            >
              {sev.charAt(0).toUpperCase() + sev.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      <div className="tab-content">
        {!hasIssues && (
          <p className="validation-panel__empty">
            ✓ No issues found. This iteration passes the current validation rules.
          </p>
        )}

        {hasIssues && visible.length === 0 && (
          <p className="validation-panel__empty">
            No {activeFilter} issues. Try a different filter.
          </p>
        )}

        {visible.length > 0 && (
          <ul className="validation-list">
            {visible.map((issue, i) => (
              <li key={`${issue.code}-${issue.ruleIndex ?? ''}-${i}`} className={`validation-item validation-item--${issue.severity}`}>
                <div className="validation-item__severity">
                  <SeverityIcon severity={issue.severity} />
                </div>
                <div className="validation-item__body">
                  <div className="validation-item__message">{issue.message}</div>
                  <div className="validation-item__meta">
                    <code className="code-inline">{issue.code}</code>
                    {issue.ruleIndex !== undefined && (
                      <span>rule #{issue.ruleIndex + 1}</span>
                    )}
                    {issue.cohortLabel && (
                      <span>cohort: <code className="code-inline">{issue.cohortLabel}</code></span>
                    )}
                    {issue.routingCode && (
                      <span>code: <code className="code-inline">{issue.routingCode}</code></span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === 'error') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="9" fill="currentColor" />
        <path d="M6 6l8 8M14 6l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (severity === 'warning') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 2L19 17H1L10 2z" fill="currentColor" />
        <path d="M10 7v5M10 14v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path d="M10 5v6M10 13v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
