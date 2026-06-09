import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props<T> {
  /** The current value. Used as the starting edit value and the read-only display. */
  value: T;
  /**
   * Render the value for display (read-only) mode. The default is
   * String(value) wrapped in <code>; pass a custom renderer for chips,
   * badges, etc.
   */
  renderDisplay?: (value: T) => ReactNode;
  /**
   * Render the editor for this cell. Most cells will use the built-in
   * <TextCellEditor>; only override for custom UIs (dropdowns,
   * multi-selects). The default is a plain text input.
   */
  renderEditor?: (args: {
    draft: string;
    onDraftChange: (next: string) => void;
    onCommit: () => void;
    onCancel: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => ReactNode;
  /**
   * Validate the (string) draft before commit. Return null/undefined if
   * valid, or a string error message to display and refuse commit.
   */
  validate?: (draft: string) => string | null | undefined;
  /**
   * Coerce the (string) draft to the typed value before calling
   * onSave. Default: (s) => s as unknown as T.
   */
  parse?: (draft: string) => T;
  /**
   * Called when the user commits a valid edit. If omitted, the cell is
   * always read-only (used when the parent doesn't have update capability
   * — e.g. the rule table is in view mode).
   */
  onSave?: (next: T) => void;
  /**
   * Optional className for the cell (e.g. for column-specific styling).
   */
  className?: string;
  /** Tooltip on the read-only cell. */
  title?: string;
  /** If true, the read-only display is rendered in a slightly muted way
   *  (used for optional fields like AttributeTarget). */
  muted?: boolean;
}

/**
 * A single click-to-edit cell. Used in the rule tables to enable
 * bulk editing without opening the RuleEditor drawer for every change.
 *
 * - Click (or Enter / Space when focused) -> enters edit mode
 * - Enter -> commit
 * - Esc -> cancel and revert
 * - Blur (e.g. clicking another cell) -> commit
 * - Tab -> commit + move focus to next focusable element (default browser
 *   behaviour; the input is a plain <input>, so Tab works naturally)
 *
 * Saves commit directly to the caller's onSave (which should call
 * useAuthor().update()). The whole copy is updated, which triggers
 * re-renders of the rule-sentence, the fallback-chain diagram, the
 * validation panel, etc.
 */
export default function InlineEditableCell<T>({
  value, renderDisplay, renderEditor, validate, parse, onSave, className, title, muted,
}: Props<T>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(value ?? ''));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasCancelled = useRef(false);

  const editable = !!onSave;

  // When the underlying value changes externally, sync our draft (only
  // when not currently editing — otherwise we'd clobber the user's input).
  useEffect(() => {
    if (!editing) setDraft(String(value ?? ''));
  }, [value, editing]);

  // Focus the input when entering edit mode.
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    if (wasCancelled.current) {
      wasCancelled.current = false;
      setError(null);
      setEditing(false);
      return;
    }
    if (draft === String(value ?? '')) {
      setError(null);
      setEditing(false);
      return; // unchanged, no-op
    }
    const err = validate?.(draft);
    if (err) {
      setError(err);
      return; // keep the editor open with the error
    }
    try {
      const parsed = parse ? parse(draft) : (draft as unknown as T);
      onSave!(parsed);
      setError(null);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid value');
    }
  };
  const cancel = () => {
    wasCancelled.current = true;
    setDraft(String(value ?? ''));
    setError(null);
    setEditing(false);
  };

  if (!editable) {
    return (
      <span className={`inline-cell inline-cell--readonly ${muted ? 'inline-cell--muted' : ''} ${className ?? ''}`} title={title}>
        {renderDisplay ? renderDisplay(value) : <code>{String(value ?? '—')}</code>}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        type="button"
        className={`inline-cell inline-cell--read-only ${error ? 'inline-cell--error' : ''} ${muted ? 'inline-cell--muted' : ''} ${className ?? ''}`}
        title={title || 'Click to edit'}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        {renderDisplay ? renderDisplay(value) : <code>{String(value ?? '—')}</code>}
        {error && <span className="inline-cell__error-dot" role="img" aria-label={error} title={error} />}
      </button>
    );
  }

  return (
    <span className={`inline-cell inline-cell--editing ${error ? 'inline-cell--error' : ''} ${className ?? ''}`}>
      {renderEditor ? (
        // eslint-disable-next-line react-hooks/refs -- inputRef is just a handle for the custom editor
        renderEditor({ draft, onDraftChange: setDraft, onCommit: commit, onCancel: cancel, inputRef })
      ) : (
        <input
          ref={inputRef}
          className="inline-cell__input"
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          onBlur={commit}
        />
      )}
      {error && <span className="inline-cell__error" role="alert">{error}</span>}
    </span>
  );
}
