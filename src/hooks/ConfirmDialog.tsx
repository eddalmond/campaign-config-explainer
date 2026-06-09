import { useCallback, useEffect, useState } from 'react';
import { confirmHost, type ActiveDialog } from './useConfirm';

/**
 * Mount once in the tree (App.tsx) to render the active confirm dialog.
 * Only one dialog is shown at a time (the most recently pushed one);
 * a queue is used internally so a second `confirm()` call doesn't
 * race the first.
 */
export default function ConfirmDialog() {
  const [, setTick] = useState(0);
  useEffect(() => confirmHost.subscribe(() => setTick((t) => t + 1)), []);

  // Read the active dialog fresh on every render. setTick forces a
  // re-render whenever the host notifies (push, dismiss, etc.).
  const active: ActiveDialog | undefined = confirmHost.top();
  const activeId = active?.id;

  // Esc handler — uses capture phase + stopImmediatePropagation so the
  // side-drawer's own Esc handler (registered on bubble phase) does
  // not also fire on the same keystroke. Hooks are unconditional: we
  // always register the handler, and the handler bails out if there's
  // no active dialog.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = confirmHost.top();
      if (!top) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      confirmHost.dismiss(top.id, false);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const close = useCallback(
    (value: boolean) => {
      if (activeId != null) confirmHost.dismiss(activeId, value);
    },
    [activeId],
  );

  if (!active) return null;

  const destructive = active.destructive !== false;
  const confirmLabel = active.confirmLabel ?? 'Confirm';
  const cancelLabel = active.cancelLabel ?? 'Cancel';

  return (
    <>
      <div
        className="drawer-backdrop drawer-backdrop--open"
        onClick={() => close(false)}
        aria-hidden="true"
      />
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">{active.title}</h2>
        <div id="confirm-dialog-message" className="confirm-dialog__message">{active.message}</div>
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => close(false)}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => close(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
