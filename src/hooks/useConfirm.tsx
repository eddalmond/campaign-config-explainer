import { useCallback, useEffect, useRef, useState } from 'react';

/** Options accepted by the `confirm` function returned by `useConfirm`. */
export interface ConfirmOptions {
  /** The title shown at the top of the dialog. Should be short and direct. */
  title: string;
  /** The body of the dialog — the question or warning. */
  message: React.ReactNode;
  /** Text for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Text for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /**
   * If true, render the confirm button in the destructive (red) style.
   * Defaults to true since most confirmations in this app are for
   * destructive actions.
   */
  destructive?: boolean;
}

interface ActiveDialog extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

/**
 * A promise-based confirmation hook. Use it in place of `window.confirm`
 * so the dialog matches the rest of the app's styled drawer UI and
 * respects the user's light/dark theme.
 *
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Delete?', message: '...', destructive: true });
 *   if (ok) doDelete();
 *
 * The hook is backed by `<ConfirmDialog />`, which must be rendered
 * exactly once in the tree (App.tsx does this).
 */
export function useConfirm(): (opts: ConfirmOptions) => Promise<boolean> {
  // We use a global ref to share the active-dialog state across all
  // useConfirm() hook instances. The renderer (<ConfirmDialog />) reads
  // from this ref; the hooks push into it. This is the simplest pattern
  // that doesn't require a context provider.
  const idRef = useRef(0);

  return useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      idRef.current += 1;
      confirmHost.push({ ...opts, id: idRef.current, resolve });
      confirmHost.notify();
    });
  }, []);
}

// --- internal: a tiny pub/sub so hooks can talk to the renderer ---

type Listener = () => void;
interface ConfirmHost {
  queue: ActiveDialog[];
  listeners: Set<Listener>;
  push: (dialog: ActiveDialog) => void;
  notify: () => void;
  subscribe: (l: Listener) => () => void;
  dismiss: (id: number, value: boolean) => void;
}

const confirmHost: ConfirmHost = (() => {
  const queue: ActiveDialog[] = [];
  const listeners = new Set<Listener>();
  return {
    queue,
    listeners,
    push: (dialog) => queue.push(dialog),
    notify: () => listeners.forEach((l) => l()),
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dismiss: (id, value) => {
      const idx = queue.findIndex((d) => d.id === id);
      if (idx < 0) return;
      const [dialog] = queue.splice(idx, 1);
      dialog.resolve(value);
      // Notify so the renderer re-evaluates which dialog (if any) is on top.
      listeners.forEach((l) => l());
    },
  };
})();

/**
 * Mount once in the tree (App.tsx) to render the active confirm dialog.
 * Only one dialog is shown at a time (the most recently pushed one);
 * a queue is used internally so a second `confirm()` call doesn't
 * race the first.
 */
export function ConfirmDialog() {
  const [, setTick] = useState(0);
  useEffect(() => confirmHost.subscribe(() => setTick((t) => t + 1)), []);
  const active = confirmHost.queue[confirmHost.queue.length - 1];
  if (!active) return null;

  const close = (value: boolean) => confirmHost.dismiss(active.id, value);

  // Esc to cancel. Use the capture phase + stopImmediatePropagation so
  // a side-drawer's own Esc handler (registered on bubble phase) does
  // not also fire on the same keystroke.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        close(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [active.id]);

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
