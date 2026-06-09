import { useEffect, useState } from 'react';
import type { CampaignConfig, Iteration, Rule, Cohort, ActionMapping } from '../types/campaign';
import { useAuthor } from '../hooks/AuthorContext';
import { useConfirm } from '../hooks/useConfirm';
import RuleEditor from './RuleEditor';
import CohortEditor from './CohortEditor';
import ActionMappingEditor from './ActionMappingEditor';
import IterationMetadataEditor from './IterationMetadataEditor';
import CampaignMetadataEditor from './CampaignMetadataEditor';
import JsonPreview from './JsonPreview';
import { CohortsOverviewDrawer, RulesOverviewDrawer, ActionsOverviewDrawer } from './OverviewDrawers';
import Drawer from './Drawer';
import CompareIterationsDrawer from './CompareIterationsDrawer';
import AdvancedFields from './AdvancedFields';

interface Props {
  iteration: Iteration;
  /** All iterations in the working copy — used by CompareIterationsDrawer. */
  iterations?: Iteration[];
  /** Rule editor state, owned by the parent so the read-only tables can trigger it. */
  editingRule: { index: number } | { new: true } | null;
  onCloseRuleEditor: () => void;
  onSaveRule: (rule: Rule, originalIndex: number | null) => void;
  onDeleteRule: (index: number) => void;
}

type LocalEditor =
  | { kind: 'metadata' }
  | { kind: 'campaign-metadata' }
  | { kind: 'json-preview' }
  | { kind: 'cohort-new' }
  | { kind: 'cohort-edit'; label: string }
  | { kind: 'action-new' }
  | { kind: 'action-edit'; key: string }
  | { kind: 'cohorts-overview' }
  | { kind: 'rules-overview' }
  | { kind: 'actions-overview' }
  | { kind: 'compare-iterations' };

export default function AuthorPanel({
  iteration,
  iterations,
  editingRule,
  onCloseRuleEditor,
  onSaveRule,
  onDeleteRule,
}: Props) {
  const { updateIteration, update, working, loaded, duplicateIteration, deleteIteration } = useAuthor();
  const confirm = useConfirm();
  const [local, setLocal] = useState<LocalEditor | null>(null);

  // Bridge from the custom events fired by the read-only tables and section headers.
  useEffect(() => {
    const onOpenCohort = (e: Event) => {
      const detail = (e as CustomEvent<{ label: string }>).detail;
      setLocal({ kind: 'cohort-edit', label: detail.label });
    };
    const onOpenAction = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      setLocal({ kind: 'action-edit', key: detail.key });
    };
    const onEditSection = (e: Event) => {
      const detail = (e as CustomEvent<{ section: string }>).detail;
      switch (detail.section) {
        case 'campaign':
          setLocal({ kind: 'campaign-metadata' });
          break;
        case 'iteration':
          setLocal({ kind: 'metadata' });
          break;
        case 'cohorts':
          setLocal({ kind: 'cohorts-overview' });
          break;
        case 'rules':
          setLocal({ kind: 'rules-overview' });
          break;
        case 'actions':
          setLocal({ kind: 'actions-overview' });
          break;
        case 'json':
          setLocal({ kind: 'json-preview' });
          break;
        case 'compare-iterations':
          setLocal({ kind: 'compare-iterations' });
          break;
      }
    };
    window.addEventListener('campaign-explainer:open-cohort', onOpenCohort);
    window.addEventListener('campaign-explainer:open-action', onOpenAction);
    window.addEventListener('campaign-explainer:edit-section', onEditSection);
    return () => {
      window.removeEventListener('campaign-explainer:open-cohort', onOpenCohort);
      window.removeEventListener('campaign-explainer:open-action', onOpenAction);
      window.removeEventListener('campaign-explainer:edit-section', onEditSection);
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

  // --- Campaign-level metadata ops ---
  const saveCampaignMetadata = (patch: Partial<CampaignConfig>) => {
    update((c) => ({ ...c, ...patch }));
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

  const isOnlyIteration = (working?.Iterations.length ?? 0) <= 1;

  const handleDuplicate = () => {
    const newId = duplicateIteration(iteration.ID, 0);
    if (newId) {
      window.dispatchEvent(new CustomEvent('campaign-explainer:select-iteration', { detail: { id: newId } }));
    }
  };
  const handleDelete = async () => {
    if (isOnlyIteration) {
      // Belt-and-braces — the Delete button is disabled in this case, so
      // this only fires if the function is called programmatically. The
      // disabled button + tooltip is the user-facing affordance.
      return;
    }
    const ok = await confirm({
      title: 'Delete iteration?',
      message: (
        <>
          Delete iteration <strong>{iteration.Name || iteration.ID}</strong>?
          This cannot be undone, but you can use <em>Reset</em> to recover
          the loaded version.
        </>
      ),
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteIteration(iteration.ID);
  };

  return (
    <>
      <div className="author-actions">
        <button type="button" className="btn btn--primary" onClick={openNewRule}>+ Add Rule</button>
        <button type="button" className="btn btn--primary" onClick={() => setLocal({ kind: 'cohort-new' })}>+ Add Cohort</button>
        <button type="button" className="btn btn--primary" onClick={() => setLocal({ kind: 'action-new' })}>+ Add Action</button>
        <button type="button" className="btn btn--secondary" onClick={() => setLocal({ kind: 'metadata' })}>Edit Iteration Settings…</button>
        <div className="author-actions__spacer" />
        <button
          type="button"
          className="btn btn--secondary"
          onClick={handleDuplicate}
          title="Deep-clone this iteration as a new one. IterationNumber is bumped, IterationDate is set to today, ID and Version are reset."
        >
          Duplicate iteration
        </button>
        <button
          type="button"
          className="btn btn--danger-text"
          onClick={handleDelete}
          disabled={isOnlyIteration}
          title={isOnlyIteration ? 'Cannot delete the only remaining iteration' : 'Delete this iteration'}
        >
          Delete iteration
        </button>
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

      {/* Campaign-level metadata editor (top of the page) */}
      {local?.kind === 'campaign-metadata' && working && (
        <CampaignMetadataEditor
          config={working}
          onClose={closeLocal}
          onSave={saveCampaignMetadata}
        />
      )}

      {/* Live JSON preview (with diff) */}
      {local?.kind === 'json-preview' && working && loaded && (
        <Drawer
          open
          onClose={closeLocal}
          width={720}
          title="Working JSON"
          subtitle="Live preview of the working copy, with optional diff against the loaded snapshot"
        >
          <div className="json-preview-wrap">
            <JsonPreview working={working} loaded={loaded} />
          </div>
        </Drawer>
      )}

      {/* Cohorts overview — quick entry into Add Cohort + list of existing */}
      {local?.kind === 'cohorts-overview' && (
        <CohortsOverviewDrawer
          iteration={iteration}
          onClose={closeLocal}
          onAdd={() => setLocal({ kind: 'cohort-new' })}
          onEdit={(label) => setLocal({ kind: 'cohort-edit', label })}
        />
      )}

      {/* Rules overview — switch to add new rule, with quick guidance */}
      {local?.kind === 'rules-overview' && (
        <RulesOverviewDrawer
          iteration={iteration}
          onClose={closeLocal}
          onAddRule={() => {
            closeLocal();
            openNewRule();
          }}
        />
      )}

      {/* Actions overview — entry into Add Action + list */}
      {local?.kind === 'actions-overview' && (
        <ActionsOverviewDrawer
          iteration={iteration}
          onClose={closeLocal}
          onAdd={() => setLocal({ kind: 'action-new' })}
          onEdit={(key) => setLocal({ kind: 'action-edit', key })}
        />
      )}

      {/* Compare iterations side-by-side */}
      {local?.kind === 'compare-iterations' && iterations && (
        <CompareIterationsDrawer
          iterations={iterations}
          defaultFromId={iteration.ID}
          onClose={closeLocal}
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
