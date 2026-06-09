import { useEffect, useState } from 'react';
import type { Cohort, YN } from '../types/campaign';
import { Field, NumberInput, Select, TextInput, Textarea } from './FormControls';
import Drawer from './Drawer';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  cohort: Cohort | null;     // null = creating
  onClose: () => void;
  onSave: (cohort: Cohort) => void;
  onDelete?: () => void;
  maxPriority: number;
}

const VIRTUAL_OPTIONS: { value: YN; label: string }[] = [
  { value: 'N', label: 'N — Real cohort' },
  { value: 'Y', label: 'Y — Virtual (everyone qualifies)' },
];

export default function CohortEditor({ cohort, onClose, onSave, onDelete, maxPriority }: Props) {
  const confirm = useConfirm();
  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = await confirm({
      title: 'Delete cohort?',
      message: 'Rules that reference this cohort will fail validation.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) onDelete();
  };
  const isNew = cohort === null;
  const [draft, setDraft] = useState<Cohort>(() => cohort
    ? structuredClone(cohort)
    : { CohortLabel: '', CohortGroup: '', Priority: maxPriority + 10, Virtual: 'N' as YN }
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(cohort ? structuredClone(cohort) : { CohortLabel: '', CohortGroup: '', Priority: maxPriority + 10, Virtual: 'N' as YN });
  }, [cohort, maxPriority]);

  const update = (patch: Partial<Cohort>) => setDraft(d => ({ ...d, ...patch }));

  return (
    <Drawer
      open
      onClose={onClose}
      width={500}
      title={isNew ? 'New Cohort' : 'Edit Cohort'}
      footer={
        <div className="drawer__footer-row">
          {!isNew && onDelete && (
            <button type="button" className="btn btn--danger" onClick={handleDelete}>Delete</button>
          )}
          <div className="drawer__footer-spacer" />
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn--primary" disabled={!draft.CohortLabel.trim() || !draft.CohortGroup.trim()} onClick={() => onSave(draft)}>Save</button>
        </div>
      }
    >
      <div className="form-grid">
        <Field label="Cohort Label" hint="Unique key referenced by rules. Use snake_case, no spaces.">
          <TextInput value={draft.CohortLabel} onChange={v => update({ CohortLabel: v.trim() })} placeholder="e.g. rsv_75_plus1day" />
        </Field>
        <Field label="Cohort Group" hint="Logical grouping; not used by rule evaluation but helps review.">
          <TextInput value={draft.CohortGroup} onChange={v => update({ CohortGroup: v })} placeholder="e.g. rsv_age" />
        </Field>
        <Field label="Priority" hint="Lower numbers evaluated first.">
          <NumberInput value={draft.Priority} onChange={n => update({ Priority: n })} min={0} step={10} />
        </Field>
        <Field label="Virtual?">
          <Select value={draft.Virtual ?? 'N'} onChange={v => update({ Virtual: v as YN })} options={VIRTUAL_OPTIONS} />
        </Field>
        <Field label="Positive Description" hint="Shown when the person IS in this cohort.">
          <Textarea value={draft.PositiveDescription ?? ''} onChange={v => update({ PositiveDescription: v || undefined })} rows={2} />
        </Field>
        <Field label="Negative Description" hint="Shown when the person is NOT in this cohort.">
          <Textarea value={draft.NegativeDescription ?? ''} onChange={v => update({ NegativeDescription: v || undefined })} rows={2} />
        </Field>
      </div>
    </Drawer>
  );
}
