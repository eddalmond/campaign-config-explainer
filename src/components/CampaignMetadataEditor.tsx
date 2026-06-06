import { useEffect, useState } from 'react';
import type { CampaignConfig, Frequency, CampaignType } from '../types/campaign';
import { Field, NumberInput, Select, TextInput } from './FormControls';
import Drawer from './Drawer';

interface Props {
  config: CampaignConfig;
  onClose: () => void;
  onSave: (patch: Partial<CampaignConfig>) => void;
}

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'X', label: 'X — One-off' },
  { value: 'D', label: 'D — Daily' },
  { value: 'W', label: 'W — Weekly' },
  { value: 'M', label: 'M — Monthly' },
  { value: 'Q', label: 'Q — Quarterly' },
  { value: 'A', label: 'A — Annual' },
];

const TYPE_OPTIONS: { value: CampaignType; label: string }[] = [
  { value: 'V', label: 'V — Vaccination' },
  { value: 'S', label: 'S — Screening' },
];

function emailListToText(arr: string[] | undefined): string {
  if (!arr || arr.length === 0) return '';
  return arr.join(', ');
}

function textToEmailList(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function CampaignMetadataEditor({ config, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Partial<CampaignConfig>>(() => structuredClone(config));

  useEffect(() => {
    setDraft(structuredClone(config));
  }, [config]);

  const update = (patch: Partial<CampaignConfig>) => setDraft(d => ({ ...d, ...patch }));

  return (
    <Drawer
      open
      onClose={onClose}
      width={560}
      title="Campaign Settings"
      subtitle={config.Name || config.ID}
    >
      <div className="form-grid">
        <Field label="ID" hint="Unique identifier. Changing this changes the localStorage key.">
          <TextInput value={draft.ID ?? ''} onChange={v => update({ ID: v })} />
        </Field>
        <Field label="Name">
          <TextInput value={draft.Name ?? ''} onChange={v => update({ Name: v })} />
        </Field>
        <Field label="Type">
          <Select<CampaignType>
            value={(draft.Type as CampaignType) ?? ''}
            onChange={v => update({ Type: v })}
            options={TYPE_OPTIONS}
            placeholder="— select —"
          />
        </Field>
        <Field label="Target" hint="Vaccine/screening code, e.g. RSV, FLU, COVID.">
          <TextInput value={draft.Target ?? ''} onChange={v => update({ Target: v })} />
        </Field>
        <Field label="Start Date" hint="YYYYMMDD. May include template tokens like <<DATE_DAY_-100>>.">
          <TextInput value={draft.StartDate ?? ''} onChange={v => update({ StartDate: v })} />
        </Field>
        <Field label="End Date" hint="YYYYMMDD. May include template tokens.">
          <TextInput value={draft.EndDate ?? ''} onChange={v => update({ EndDate: v })} />
        </Field>
        <Field label="Iteration Frequency">
          <Select<Frequency>
            value={draft.IterationFrequency ?? ''}
            onChange={v => update({ IterationFrequency: v })}
            options={FREQ_OPTIONS}
            placeholder="— select —"
          />
        </Field>

        <div className="form-section">
          <div className="form-section__title">Defaults &amp; Lifecycle</div>
          <Field label="Version">
            <NumberInput value={draft.Version ?? 1} onChange={n => update({ Version: n })} min={0} />
          </Field>
          <Field label="Iteration Type" hint="Default type assigned to new iterations.">
            <TextInput
              value={draft.IterationType ?? ''}
              onChange={v => update({ IterationType: v || undefined })}
              placeholder="O"
            />
          </Field>
          <Field label="Iteration Time" hint="e.g. <<TIME_HOUR_1>> or HH:MM.">
            <TextInput
              value={draft.IterationTime ?? ''}
              onChange={v => update({ IterationTime: v || undefined })}
              placeholder="<<TIME_HOUR_1>>"
            />
          </Field>
          <Field label="Default Comms Routing" hint="Pipe-separated codes, e.g. CODE1|CODE2.">
            <TextInput
              value={draft.DefaultCommsRouting ?? ''}
              onChange={v => update({ DefaultCommsRouting: v || undefined })}
            />
          </Field>
          <Field label="Approval Minimum">
            <NumberInput
              value={draft.ApprovalMinimum ?? 0}
              onChange={n => update({ ApprovalMinimum: n })}
              min={0}
            />
          </Field>
          <Field label="Approval Maximum">
            <NumberInput
              value={draft.ApprovalMaximum ?? 0}
              onChange={n => update({ ApprovalMaximum: n })}
              min={0}
            />
          </Field>
        </div>

        <div className="form-section">
          <div className="form-section__title">People</div>
          <Field label="Managers" hint="Comma- or newline-separated email addresses.">
            <TextInput
              value={emailListToText(draft.Manager)}
              onChange={v => update({ Manager: textToEmailList(v) })}
            />
          </Field>
          <Field label="Approvers">
            <TextInput
              value={emailListToText(draft.Approver)}
              onChange={v => update({ Approver: textToEmailList(v) })}
            />
          </Field>
          <Field label="Reviewers">
            <TextInput
              value={emailListToText(draft.Reviewer)}
              onChange={v => update({ Reviewer: textToEmailList(v) })}
            />
          </Field>
        </div>
      </div>

      <div className="drawer__footer drawer__footer--inline">
        <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={() => onSave(draft)}>Save</button>
      </div>
    </Drawer>
  );
}
