import { useEffect, useState } from 'react';
import type { Iteration, Rule, Cohort, ActionMapping } from '../types/campaign';
import { useAuthor } from '../hooks/AuthorContext';
import RuleEditor from './RuleEditor';
import CohortEditor from './CohortEditor';
import ActionMappingEditor from './ActionMappingEditor';
import IterationMetadataEditor from './IterationMetadataEditor';
import AdvancedFields from './AdvancedFields';

interface Props {
  iteration: Iteration;
  /** Rule editor state, owned by the parent so the read-only tables can trigger it. */
  editingRule: { index: number } | { new: true } | null;
  onCloseRuleEditor: () => void;
  onSaveRule: (rule: Rule, originalIndex: number | null) => void;
  onDeleteRule: (index: number) => void;
}

type LocalEditor =
  | { kind: 'metadata' }
  | { kind: 'cohort-new' }
  | { kind: 'cohort-edit'; label: string }
  | { kind: 'action-new' }
  | { kind: 'action-edit'; key: string };

export default function AuthorPanel({
  iteration,
  editingRule,
  onCloseRuleEditor,
  onSaveRule,
  onDeleteRule,
}: Props) {
  const { updateIteration } = useAuthor();
  const [local, setLocal] = useState<LocalEditor | null>(null);

  // Bridge from the custom events fired by the read-only cohort/action tables.
  useEffect(() => {
    const onOpenCohort = (e: Event) => {
      const detail = (e as CustomEvent<{ label: string }>).detail;
      setLocal({ kind: 'cohort-edit', label: detail.label });
    };
    const onOpenAction = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      setLocal({ kind: 'action-edit', key: detail.key });
    };
    window.addEventListener('campaign-explainer:open-cohort', onOpenCohort);
    window.addEventListener('campaign-explainer:open-action', onOpenAction);
    return () => {
      window.removeEventListener('campaign-explainer:open-cohort', onOpenCohort);
      window.removeEventListener('campaign-explainer:open-action', onOpenAction);
    };
  }, []);

  const closeLocal = () => setLocal(null);

  // --- Cohort ops ---
  const saveCohort = (cohort: Cohort) => {
    updateIteration(iteration.ID, (it) => {
      const cohorts = [...(it.IterationCohorts || [])];
      const existingIndex = cohorts.findIndex(c => c.CohortLabel === cohort.CohortLabel);
      if (existingIndex >= 0) {
        cohorts[existingIndex] = cohort;
      } else {
        cohorts.push(cohort);
      }
      return { ...it, IterationCohorts: cohorts };
    });
    closeLocal();
  };
  const deleteCohort = (label: string) => {
    updateIteration(iteration.ID, (it) => ({
      ...it,
      IterationCohorts: (it.IterationCohorts || []).filter(c => c.CohortLabel !== label),
    }));
    closeLocal();
  };
  const existingCohort = (label: string) =>
    (iteration.IterationCohorts || []).find(c => c.CohortLabel === label) || null;

  // --- Action mapper ops ---
  const saveAction = (key: string, mapping: ActionMapping) => {
    updateIteration(iteration.ID, (it) => {
      const mapper = { ...(it.ActionsMapper || {}) };
      if (local?.kind === 'action-edit' && local.key !== key) {
        delete mapper[local.key];
      }
      mapper[key] = mapping;
      return { ...it, ActionsMapper: mapper };
    });
    closeLocal();
  };
  const deleteAction = (key: string) => {
    updateIteration(iteration.ID, (it) => {
      const mapper = { ...(it.ActionsMapper || {}) };
      delete mapper[key];
      return { ...it, ActionsMapper: mapper };
    });
    closeLocal();
  };

  // --- Metadata ops ---
  const saveMetadata = (patch: Partial<Iteration>) => {
    updateIteration(iteration.ID, (it) => ({ ...it, ...patch }));
    closeLocal();
  };

  const maxCohortPriority = Math.max(0, ...(iteration.IterationCohorts || []).map(c => c.Priority || 0));

  // Advanced fields: iteration-level fields we don't have a typed editor for
  const knownKeys = new Set([
    'ID', 'Name', 'IterationDate', 'Type', 'CommsType', 'StatusText',
    'DefaultCommsRouting', 'DefaultNotEligibleRouting', 'DefaultNotActionableRouting',
    'IterationRules', 'IterationCohorts', 'ActionsMapper', 'RulesMapper',
    'Version', 'IterationNumber', 'ApprovalMinimum', 'ApprovalMaximum',
  ]);
  const advancedIterationFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(iteration)) {
    if (!knownKeys.has(k)) advancedIterationFields[k] = v;
  }
  const hasAdvancedFields = Object.keys(advancedIterationFields).length > 0;

  const updateAdvanced = (next: Record<string, unknown>) => {
    updateIteration(iteration.ID, (it) => {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(it)) {
        if (knownKeys.has(k)) cleaned[k] = v as unknown;
      }
      for (const [k, v] of Object.entries(next)) {
        cleaned[k] = v;
      }
      return cleaned as unknown as Iteration;
    });
  };

  const openNewRule = () => {
    window.dispatchEvent(new CustomEvent('campaign-explainer:open-new-rule'));
  };

  return (
    <>
      <div className="author-actions">
        <button type="button" className="btn btn--primary" onClick={openNewRule}>+ Add Rule</button>
        <button type="button" className="btn btn--primary" onClick={() => setLocal({ kind: 'cohort-new' })}>+ Add Cohort</button>
        <button type="button" className="btn btn--primary" onClick={() => setLocal({ kind: 'action-new' })}>+ Add Action</button>
        <button type="button" className="btn btn--secondary" onClick={() => setLocal({ kind: 'metadata' })}>Edit Iteration Settings…</button>
      </div>

      {/* Rule editor (state owned by parent) */}
      {editingRule && 'new' in editingRule ? (
        <RuleEditor
          iteration={iteration}
          ruleIndex={null}
          onClose={onCloseRuleEditor}
          onSave={onSaveRule}
        />
      ) : editingRule ? (
        <RuleEditor
          iteration={iteration}
          ruleIndex={editingRule.index}
          onClose={onCloseRuleEditor}
          onSave={onSaveRule}
          onDelete={onDeleteRule}
        />
      ) : null}

      {/* Cohort editors */}
      {local?.kind === 'cohort-new' && (
        <CohortEditor
          cohort={null}
          maxPriority={maxCohortPriority}
          onClose={closeLocal}
          onSave={saveCohort}
        />
      )}
      {local?.kind === 'cohort-edit' && (
        <CohortEditor
          cohort={existingCohort(local.label)}
          maxPriority={maxCohortPriority}
          onClose={closeLocal}
          onSave={saveCohort}
          onDelete={() => deleteCohort(local.label)}
        />
      )}

      {/* Action mapping editors */}
      {local?.kind === 'action-new' && (
        <ActionMappingEditor
          keyName={null}
          mapping={null}
          onClose={closeLocal}
          onSave={saveAction}
        />
      )}
      {local?.kind === 'action-edit' && (
        <ActionMappingEditor
          keyName={local.key}
          mapping={(iteration.ActionsMapper || {})[local.key] || null}
          onClose={closeLocal}
          onSave={saveAction}
          onDelete={deleteAction}
        />
      )}

      {/* Iteration metadata editor */}
      {local?.kind === 'metadata' && (
        <IterationMetadataEditor
          iteration={iteration}
          onClose={closeLocal}
          onSave={saveMetadata}
        />
      )}

      {hasAdvancedFields && (
        <div className="mt-6">
          <AdvancedFields data={advancedIterationFields} onChange={updateAdvanced} />
        </div>
      )}
    </>
  );
}
