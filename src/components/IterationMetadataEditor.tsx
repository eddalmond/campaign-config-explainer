import { useEffect, useState } from 'react';
import type { Iteration } from '../types/campaign';
import { Field, NumberInput, TextInput, Textarea, Checkbox } from './FormControls';
import Drawer from './Drawer';

interface Props {
  iteration: Iteration;
  onClose: () => void;
  onSave: (patch: Partial<Iteration>) => void;
}

export default function IterationMetadataEditor({ iteration, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Partial<Iteration>>(structuredClone(iteration));

  useEffect(() => {
    setDraft(structuredClone(iteration));
  }, [iteration]);

  const update = (patch: Partial<Iteration>) => setDraft(d => ({ ...d, ...patch }));

  const statusText = draft.StatusText || {};

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title="Iteration Settings"
      subtitle={iteration.Name || iteration.ID}
    >
      <div className="form-grid">
        <Field label="Name">
          <TextInput value={draft.Name ?? ''} onChange={v => update({ Name: v })} />
        </Field>
        <Field label="Iteration Date" hint="May include template tokens like <<DATE_DAY_-100>>.">
          <TextInput value={draft.IterationDate ?? ''} onChange={v => update({ IterationDate: v })} />
        </Field>
        <Field label="Type" hint="O = On-demand, A = Automatic, M = Manual, S = Scheduled.">
          <TextInput value={draft.Type ?? ''} onChange={v => update({ Type: v })} placeholder="O" />
        </Field>
        <Field label="CommsType" hint="I = In-app message, P = Push, S = SMS, E = Email.">
          <TextInput value={draft.CommsType ?? ''} onChange={v => update({ CommsType: v })} placeholder="I" />
        </Field>
        <Field label="Iteration Number" hint="Sequence number for display in tooling.">
          <NumberInput value={draft.IterationNumber ?? 0} onChange={n => update({ IterationNumber: n })} min={0} />
        </Field>
        <Field label="Version">
          <NumberInput value={draft.Version ?? 1} onChange={n => update({ Version: n })} min={0} />
        </Field>

        <div className="form-section">
          <div className="form-section__title">Default Routing</div>
          <Field label="Actionable (R fallback)" hint="CommsRouting used when an R rule group doesn't match.">
            <TextInput
              value={draft.DefaultCommsRouting ?? ''}
              onChange={v => update({ DefaultCommsRouting: v || undefined })}
              placeholder="CODE1|CODE2"
            />
          </Field>
          <Field label="Not Eligible (X fallback)">
            <TextInput
              value={draft.DefaultNotEligibleRouting ?? ''}
              onChange={v => update({ DefaultNotEligibleRouting: v || undefined })}
            />
          </Field>
          <Field label="Not Actionable (Y fallback)">
            <TextInput
              value={draft.DefaultNotActionableRouting ?? ''}
              onChange={v => update({ DefaultNotActionableRouting: v || undefined })}
            />
          </Field>
        </div>

        <div className="form-section">
          <div className="form-section__title">Status Text</div>
          <Field label="Actionable">
            <Textarea value={statusText.Actionable ?? ''} onChange={v => update({ StatusText: { ...statusText, Actionable: v || undefined } })} rows={2} />
          </Field>
          <Field label="Not Actionable">
            <Textarea value={statusText.NotActionable ?? ''} onChange={v => update({ StatusText: { ...statusText, NotActionable: v || undefined } })} rows={2} />
          </Field>
          <Field label="Not Eligible">
            <Textarea value={statusText.NotEligible ?? ''} onChange={v => update({ StatusText: { ...statusText, NotEligible: v || undefined } })} rows={2} />
          </Field>
          <Checkbox
            checked={!!draft.StatusText}
            onChange={v => update({ StatusText: v ? (statusText.Actionable || statusText.NotActionable || statusText.NotEligible ? statusText : { Actionable: '', NotActionable: '', NotEligible: '' }) : undefined })}
            label="Include Status Text in this iteration"
            hint="When off, StatusText is removed from the iteration."
          />
        </div>
      </div>

      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={() => onSave(draft)}>Save</button>
      </div>
    </Drawer>
  );
}
