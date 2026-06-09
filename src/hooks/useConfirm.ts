import { useCallback, useRef } from 'react';

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

export interface ActiveDialog extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
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
  top: () => ActiveDialog | undefined;
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
    top: () => queue[queue.length - 1],
  };
})();

export { confirmHost };

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
  // We use a ref to share the active-dialog state across all
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
