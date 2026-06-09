import { useEffect, useState } from 'react';
import type { ActionMapping } from '../types/campaign';
import { KNOWN_ACTION_TYPES } from '../data/catalog';
import { Field, Select, TextInput } from './FormControls';
import MarkdownTextarea from './MarkdownTextarea';
import Drawer from './Drawer';
import { useConfirm } from '../hooks/useConfirm';

interface Props {
  /** Existing key — if null we're creating a new entry. */
  keyName: string | null;
  /** Existing entry — only present when editing. */
  mapping: ActionMapping | null;
  onClose: () => void;
  onSave: (key: string, mapping: ActionMapping) => void;
  onDelete?: (key: string) => void;
}

const ACTION_TYPE_OPTIONS = Array.from(KNOWN_ACTION_TYPES).map(t => ({
  value: t,
  label: t,
}));

export default function ActionMappingEditor({ keyName, mapping, onClose, onSave, onDelete }: Props) {
  const confirm = useConfirm();
  const handleDelete = async () => {
    if (!onDelete || !keyName) return;
    const ok = await confirm({
      title: 'Delete action?',
      message: (
        <>
          Delete action <strong>{keyName}</strong>? Rules routing to it will
          fail validation.
        </>
      ),
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) onDelete(keyName);
  };
  const isNew = keyName === null;
  const [draftKey, setDraftKey] = useState(keyName ?? '');
  const [draft, setDraft] = useState<ActionMapping>(() => mapping ? structuredClone(mapping) : {
    ExternalRoutingCode: '',
    ActionType: 'InfoText',
    ActionDescription: '',
    UrlLink: '',
    UrlLabel: '',
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftKey(keyName ?? '');
    setDraft(mapping ? structuredClone(mapping) : {
      ExternalRoutingCode: '',
      ActionType: 'InfoText',
      ActionDescription: '',
      UrlLink: '',
      UrlLabel: '',
    });
  }, [keyName, mapping]);

  const update = (patch: Partial<ActionMapping>) => setDraft(d => ({ ...d, ...patch }));

  // Allow custom ActionType values but warn.
  const isKnownActionType = !draft.ActionType || KNOWN_ACTION_TYPES.has(draft.ActionType);

  return (
    <Drawer
      open
      onClose={onClose}
      width={520}
      title={isNew ? 'New Action Mapping' : `Edit Action: ${keyName}`}
      footer={
        <div className="drawer__footer-row">
          {!isNew && onDelete && (
            <button type="button" className="btn btn--danger" onClick={handleDelete}>Delete</button>
          )}
          <div className="drawer__footer-spacer" />
          <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!draftKey.trim()}
            onClick={() => onSave(draftKey.trim(), draft)}
          >Save</button>
        </div>
      }
    >
      <div className="form-grid">
        <Field label="Internal Routing Code" hint="The key referenced in rule CommsRouting fields.">
          <TextInput
            value={draftKey}
            onChange={v => setDraftKey(v.toUpperCase().replace(/\s+/g, '_'))}
            placeholder="e.g. BOOK_NBS"
            disabled={!isNew}
          />
        </Field>
        <Field label="External Routing Code" hint="Code sent to the front-end / comms system.">
          <TextInput
            value={draft.ExternalRoutingCode ?? ''}
            onChange={v => update({ ExternalRoutingCode: v || undefined })}
          />
        </Field>
        <Field label="Action Type">
          <Select
            value={draft.ActionType ?? ''}
            onChange={v => update({ ActionType: v || undefined })}
            options={ACTION_TYPE_OPTIONS}
            placeholder="(none)"
          />
          {!isKnownActionType && (
            <span className="form-hint" style={{ color: 'var(--warning)' }}>
              ⚠ "{draft.ActionType}" is not a known ActionType. Validation will warn.
            </span>
          )}
        </Field>
        <Field label="Action Description" hint="Markdown supported. Use template tokens like [[TARGET.RSV.LAST_SUCCESSFUL_DATE:DATE(...)]] for substitutions.">
          <MarkdownTextarea
            value={draft.ActionDescription ?? ''}
            onChange={v => update({ ActionDescription: v || undefined })}
            rows={5}
            placeholder="e.g. ### Getting the vaccine&#10;&#10;We believe you're eligible. [Book now](https://example.org/book)"
          />
        </Field>
        <Field label="URL Link" hint="Optional. Leave blank for pure text actions.">
          <TextInput
            value={draft.UrlLink ?? ''}
            onChange={v => update({ UrlLink: v || undefined })}
            placeholder="https://..."
          />
        </Field>
        <Field label="URL Label" hint="Link text shown to the user.">
          <TextInput
            value={draft.UrlLabel ?? ''}
            onChange={v => update({ UrlLabel: v || undefined })}
          />
        </Field>
      </div>
    </Drawer>
  );
}
