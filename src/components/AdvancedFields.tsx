import { useState } from 'react';
import { TextInput, Textarea } from './FormControls';

interface Props {
  data: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

function isEditableValue(v: unknown): v is string | number | boolean {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';
}

/**
 * Renders a flat object as editable fields, preserving the original value types.
 * Used for fields the editor doesn't know about — saves them from being silently
 * dropped, while exposing them in a "scary but real" way.
 */
export default function AdvancedFields({ data, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div className="card">
        <button
          type="button"
          className="advanced-fields__toggle"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="advanced-fields__caret">{open ? '▼' : '▶'}</span>
          Advanced fields (none)
        </button>
      </div>
    );
  }

  const update = (key: string, value: unknown) => {
    const next = { ...data };
    if (value === '' || value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onChange(next);
  };

  return (
    <div className="card">
      <button
        type="button"
        className="advanced-fields__toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="advanced-fields__caret">{open ? '▼' : '▶'}</span>
        Advanced fields ({entries.length})
        <span className="form-hint" style={{ marginLeft: '0.5rem' }}>
          Fields the editor doesn't have a typed input for. Edit at your own risk.
        </span>
      </button>
      {open && (
        <div className="advanced-fields__body form-grid">
          {entries.map(([key, value]) => {
            const label = `${key} (${typeof value})`;
            if (typeof value === 'string') {
              return (
                <div key={key} className="field">
                  <label className="form-label">{label}</label>
                  <TextInput value={value} onChange={v => update(key, v)} />
                </div>
              );
            }
            if (typeof value === 'number') {
              return (
                <div key={key} className="field">
                  <label className="form-label">{label}</label>
                  <TextInput value={String(value)} onChange={v => {
                    const n = Number(v);
                    update(key, Number.isFinite(n) ? n : v);
                  }} />
                </div>
              );
            }
            if (typeof value === 'boolean') {
              return (
                <div key={key} className="field">
                  <label className="form-label">{label}</label>
                  <TextInput value={value ? 'true' : 'false'} onChange={v => update(key, v === 'true')} />
                </div>
              );
            }
            // Fall back to JSON text
            return (
              <div key={key} className="field">
                <label className="form-label">{label}</label>
                <Textarea
                  rows={3}
                  value={JSON.stringify(value, null, 2)}
                  onChange={v => {
                    try {
                      update(key, JSON.parse(v));
                    } catch {
                      /* keep as string */
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Suppress unused import warning for the type guard when it isn't called.
void isEditableValue;
