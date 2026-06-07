import { useMemo, useState, useEffect } from 'react';
import type { Iteration, Rule, RuleType, AttributeLevel } from '../types/campaign';
import {
  attributesForLevel,
  getAttribute,
  getOperator,
  operatorsForType,
  type AttributeDef,
} from '../data/catalog';
import { explainOperator, explainRule, type RuleGroupContext } from '../utils/explain';
import { useRecentAttributes } from '../hooks/useRecentAttributes';
import { Field, NumberInput, Select, TextInput, MultiSelect, Checkbox } from './FormControls';
import Drawer from './Drawer';
import MarkdownTextarea from './MarkdownTextarea';

interface Props {
  iteration: Iteration;
  ruleIndex: number | null;       // null = creating new
  onClose: () => void;
  onSave: (rule: Rule, originalIndex: number | null) => void;
  onDelete?: (index: number) => void;
}

const RULE_TYPES: { value: RuleType; label: string; description: string }[] = [
  { value: 'F', label: 'F — Filter', description: 'Removes a person from a cohort when matched' },
  { value: 'S', label: 'S — Suppression', description: 'Sets status to not_actionable when matched (typically RuleStop)' },
  { value: 'R', label: 'R — Actionable routing', description: 'Fires when final status is actionable' },
  { value: 'X', label: 'X — Not-eligible routing', description: 'Fires when final status is not_eligible' },
  { value: 'Y', label: 'Y — Not-actionable routing', description: 'Fires when final status is not_actionable' },
];

const ATTRIBUTE_LEVELS: { value: AttributeLevel; label: string }[] = [
  { value: 'PERSON', label: 'PERSON' },
  { value: 'TARGET', label: 'TARGET' },
  { value: 'COHORT', label: 'COHORT' },
];

const TARGET_OPTIONS = ['RSV']; // Extend as more vaccines get added

function makeBlankRule(type: RuleType, maxPriority: number): Rule {
  return {
    Type: type,
    Name: '',
    Priority: maxPriority + 10,
    Description: '',
    AttributeLevel: undefined,
    AttributeName: undefined,
    AttributeTarget: undefined,
    Operator: undefined,
    Comparator: undefined,
    CohortLabel: undefined,
    RuleStop: undefined,
    CommsRouting: undefined,
  };
}

export default function RuleEditor({ iteration, ruleIndex, onClose, onSave, onDelete }: Props) {
  const isNew = ruleIndex === null;
  const original = isNew ? null : (iteration.IterationRules || [])[ruleIndex];
  const maxPriority = useMemo(
    () => Math.max(0, ...(iteration.IterationRules || []).map(r => r.Priority || 0)),
    [iteration.IterationRules],
  );
  const { remember, sortByRecency } = useRecentAttributes();

  const [draft, setDraft] = useState<Rule>(() => original ? structuredClone(original) : makeBlankRule('F', maxPriority));

  // If we open a different rule, reset the draft.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(original ? structuredClone(original) : makeBlankRule('F', maxPriority));
  }, [ruleIndex, original, maxPriority]);

  // Derived: attribute catalog filtered by the current level+target,
  // then sorted so recently-used attributes float to the top.
  const attributeOptions = useMemo(() => {
    if (!draft.AttributeLevel) return [] as AttributeDef[];
    const target = draft.AttributeLevel === 'TARGET' ? draft.AttributeTarget : undefined;
    const all = attributesForLevel(draft.AttributeLevel, target);
    return sortByRecency(all);
  }, [draft.AttributeLevel, draft.AttributeTarget, sortByRecency]);

  const currentAttribute = getAttribute(draft.AttributeName, draft.AttributeLevel, draft.AttributeTarget);
  const validOperators = useMemo(
    () => operatorsForType(currentAttribute?.type),
    [currentAttribute?.type],
  );

  // Cohort multi-select options: defined cohort labels.
  const cohortOptions = useMemo(
    () => (iteration.IterationCohorts || []).map(c => ({
      value: c.CohortLabel,
      label: c.CohortLabel,
      description: c.CohortGroup,
    })),
    [iteration.IterationCohorts],
  );

  // Routing multi-select options: keys in ActionsMapper.
  const routingOptions = useMemo(
    () => Object.keys(iteration.ActionsMapper || {}).map(key => ({
      value: key,
      label: key,
    })),
    [iteration.ActionsMapper],
  );

  const update = (patch: Partial<Rule>) => setDraft(d => ({ ...d, ...patch }));

  const updateCohortLabels = (labels: string[]) => {
    update({ CohortLabel: labels.length > 0 ? labels.join(',') : undefined });
  };
  const updateCommsRouting = (codes: string[]) => {
    update({ CommsRouting: codes.length > 0 ? codes.join('|') : undefined });
  };

  const cohortLabelList = (draft.CohortLabel || '').split(',').map(s => s.trim()).filter(Boolean);
  const commsRoutingList = (draft.CommsRouting || '').split('|').map(s => s.trim()).filter(Boolean);

  // Live preview of operator explanation
  const explanation = useMemo(() => explainOperator(draft), [draft]);
  // Full natural-language sentence of the whole rule
  // The group size counts this rule plus any other rules in the same
  // Type+Priority+Name bucket. We compute this from the draft (so editing
  // the Name or Priority updates the sentence live) plus the saved
  // iteration rules (to find siblings).
  const groupContext: RuleGroupContext = useMemo(() => {
    if (!draft.Name || draft.Priority == null) {
      return { groupSize: 1, groupName: null };
    }
    const allRules = iteration.IterationRules || [];
    // Count siblings in the same Type+Priority+Name group, *excluding*
    // the current rule's own position when editing an existing rule
    // (otherwise we'd double-count ourselves).
    const siblings = allRules.filter(
      (r, idx) =>
        idx !== ruleIndex &&
        r.Type === draft.Type &&
        r.Priority === draft.Priority &&
        r.Name === draft.Name
    );
    const totalInGroup = siblings.length + 1; // +1 for the current rule
    return {
      groupSize: totalInGroup,
      groupName: draft.Name,
    };
  }, [iteration.IterationRules, draft.Type, draft.Priority, draft.Name, ruleIndex]);
  const ruleSentence = useMemo(() => explainRule(draft, groupContext), [draft, groupContext]);

  const handleSave = () => {
    if (draft.AttributeName && draft.AttributeLevel) {
      remember(draft.AttributeName, draft.AttributeLevel, draft.AttributeTarget || '');
    }
    onSave(draft, ruleIndex);
  };

  const errors: string[] = [];
  if (!draft.Name?.trim()) errors.push('Name is required');
  if (draft.Priority === undefined || draft.Priority === null) errors.push('Priority is required');
  if (draft.AttributeName && !currentAttribute) errors.push(`Attribute "${draft.AttributeName}" is not in the catalog`);
  if ((draft.Type === 'R' || draft.Type === 'X' || draft.Type === 'Y') && !draft.CommsRouting) {
    errors.push(`${draft.Type} rules must specify CommsRouting`);
  }

  const showTarget = draft.AttributeLevel === 'TARGET';
  const showRuleStop = draft.Type === 'S';
  const showRouting = draft.Type === 'R' || draft.Type === 'X' || draft.Type === 'Y';
  const showComparator = !!draft.Operator;

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title={isNew ? 'New Rule' : `Edit Rule`}
      subtitle={`Iteration: ${iteration.Name || iteration.ID}`}
      footer={
        <div className="drawer__footer-row">
          {!isNew && onDelete && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                if (confirm('Delete this rule?')) {
                  onDelete(ruleIndex!);
                }
              }}
            >
              Delete
            </button>
          )}
          <div className="drawer__footer-spacer" />
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={errors.length > 0}
            onClick={handleSave}
            title={errors.length > 0 ? errors.join('; ') : 'Save changes'}
          >
            {isNew ? 'Add Rule' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="rule-sentence" data-rule-type={draft.Type}>
        <div className="rule-sentence__label">What this rule does</div>
        <div className="rule-sentence__text">{ruleSentence}</div>
      </div>

      <div className="form-grid">
        <Field label="Type">
          <Select
            value={draft.Type}
            onChange={v => update({ Type: v as RuleType })}
            options={RULE_TYPES.map(t => ({ value: t.value, label: t.label, description: t.description }))}
          />
        </Field>

        <Field label="Priority" hint="Lower numbers fire first. Use gaps of 10 to leave room for insertions.">
          <NumberInput
            value={draft.Priority}
            onChange={n => update({ Priority: n })}
            min={0}
            step={10}
          />
        </Field>

        <Field label="Name" error={!draft.Name?.trim() ? 'Required' : undefined}>
          <TextInput
            value={draft.Name}
            onChange={v => update({ Name: v })}
            placeholder="e.g. Remove from magic cohort if already vaccinated"
          />
        </Field>

        <Field label="Description" hint="User-facing text shown in some flows. Markdown supported. May include template tokens like [[TARGET.RSV.LAST_SUCCESSFUL_DATE:DATE(%-d %B %Y)]].">
          <MarkdownTextarea
            value={draft.Description ?? ''}
            onChange={v => update({ Description: v || undefined })}
            rows={4}
            placeholder="e.g. ### You've had your RSV vaccination&#10;&#10;We believe you were vaccinated on [[TARGET.RSV.LAST_SUCCESSFUL_DATE:DATE(%-d %B %Y)]]."
          />
        </Field>

        <Field label="Cohort scope" hint="Leave empty to apply to all cohorts.">
          <MultiSelect
            value={cohortLabelList}
            onChange={updateCohortLabels}
            options={cohortOptions}
          />
        </Field>

        <div className="form-section">
          <div className="form-section__title">Attribute</div>
        <Field label="Level">
          <Select
            value={(draft.AttributeLevel ?? '') as AttributeLevel}
            onChange={v => update({
              AttributeLevel: (v || undefined) as AttributeLevel | undefined,
              // Reset name + target when level changes
              AttributeName: undefined,
              AttributeTarget: v === 'TARGET' ? draft.AttributeTarget : undefined,
            })}
            options={ATTRIBUTE_LEVELS}
            placeholder="(none)"
          />
        </Field>
          {showTarget && (
            <Field label="Target" hint="The vaccine/condition this attribute is scoped to.">
              <Select
                value={draft.AttributeTarget ?? ''}
                onChange={v => update({
                  AttributeTarget: v || undefined,
                  // Reset attribute name when target changes (target-scoped attributes change)
                  AttributeName: undefined,
                })}
                options={TARGET_OPTIONS.map(t => ({ value: t, label: t }))}
                placeholder="(none)"
              />
            </Field>
          )}
          {draft.AttributeLevel && (
            <Field label="Attribute name">
              <Select
                value={draft.AttributeName ?? ''}
                onChange={v => update({ AttributeName: v || undefined })}
                options={attributeOptions.map(a => ({
                  value: a.name,
                  label: a.name,
                  description: a.description,
                }))}
                placeholder="(none)"
              />
            </Field>
          )}
        </div>

        {draft.AttributeName && (
          <div className="form-section">
            <div className="form-section__title">Comparator</div>
            <Field
              label="Operator"
              hint={currentAttribute
                ? `Valid for ${currentAttribute.type} values: ${currentAttribute.description}`
                : undefined}
            >
              <Select
                value={draft.Operator ?? ''}
                onChange={v => update({ Operator: v || undefined })}
                options={validOperators.map(o => ({
                  value: o.symbol,
                  label: o.symbol,
                  description: o.description,
                }))}
                placeholder="(none)"
              />
            </Field>
            {showComparator && (
              <Field
                label="Comparator"
                hint={getOperator(draft.Operator)?.comparatorHint ?? undefined}
              >
                <TextInput
                  value={draft.Comparator ?? ''}
                  onChange={v => update({ Comparator: v || undefined })}
                  placeholder={
                    draft.Operator?.startsWith('Y') ? '-25' :
                    draft.Operator?.startsWith('D') ? '0' :
                    draft.Operator?.startsWith('W') ? '12' :
                    draft.Operator === 'in' || draft.Operator === 'not_in' ? 'VALUE1,VALUE2' :
                    draft.Operator === 'MemberOf' || draft.Operator === 'NotMemberOf' ? 'cohort_label' :
                    draft.Operator === 'between' || draft.Operator === 'not_between' ? '100,200' :
                    draft.Operator === 'contains' || draft.Operator === 'not_contains' ? 'substring' :
                    draft.Operator === 'starts_with' || draft.Operator === 'not_starts_with' ? 'prefix' :
                    draft.Operator === 'ends_with' ? 'suffix' :
                    draft.Operator?.startsWith('is_') || draft.Operator?.startsWith('not_') ? '(no value needed)' :
                    'value'
                  }
                  disabled={
                    draft.Operator === 'is_null' || draft.Operator === 'is_not_null' ||
                    draft.Operator === 'is_empty' || draft.Operator === 'is_not_empty' ||
                    draft.Operator === 'is_true' || draft.Operator === 'is_false'
                  }
                />
                {draft.Operator && draft.Comparator && (
                  <div className="rule-explanation" style={{ marginTop: '0.25rem' }}>
                    Reads as: {explanation}
                  </div>
                )}
              </Field>
            )}
          </div>
        )}

        {showRuleStop && (
          <Field label="RuleStop" hint="When matched, this is the final suppression for the iteration.">
            <Checkbox
              checked={draft.RuleStop === true || draft.RuleStop === 'Y'}
              onChange={v => update({ RuleStop: v ? 'Y' : undefined })}
              label="Stop further rule evaluation on match"
            />
          </Field>
        )}

        {showRouting && (
          <Field label="CommsRouting" hint="One or more internal routing codes. Codes must exist in ActionsMapper.">
            <MultiSelect
              value={commsRoutingList}
              onChange={updateCommsRouting}
              options={routingOptions}
            />
            {routingOptions.length === 0 && (
              <span className="form-hint">
                ⚠ No actions defined in ActionsMapper yet. Add some in the ActionsMapper section first.
              </span>
            )}
          </Field>
        )}

        {errors.length > 0 && (
          <div className="form-errors">
            {errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}
      </div>
    </Drawer>
  );
}
