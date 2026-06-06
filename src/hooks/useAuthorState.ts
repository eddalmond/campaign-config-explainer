/* eslint-disable react-hooks/set-state-in-effect -- synchronizing with localStorage on prop change is the correct use of useEffect */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampaignConfig, Iteration } from '../types/campaign';

const STORAGE_PREFIX = 'campaign-explainer:working:';
const VIEW_MODE_KEY = 'campaign-explainer:view-mode';

export type ViewMode = 'view' | 'author';

function loadWorking(campaignId: string | undefined): CampaignConfig | null {
  if (!campaignId) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + campaignId);
    if (!raw) return null;
    return JSON.parse(raw) as CampaignConfig;
  } catch {
    return null;
  }
}

function saveWorking(campaignId: string, config: CampaignConfig): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + campaignId, JSON.stringify(config));
  } catch (err) {
    console.warn('Failed to persist working copy', err);
  }
}

function loadViewMode(): ViewMode {
  try {
    const v = window.localStorage.getItem(VIEW_MODE_KEY);
    return v === 'author' ? 'author' : 'view';
  } catch {
    return 'view';
  }
}

function saveViewMode(mode: ViewMode): void {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch { /* ignore */ }
}

export interface AuthorState {
  /** The immutable snapshot loaded from the user's JSON. */
  loaded: CampaignConfig | null;
  /** The mutable working copy used in Author mode. */
  working: CampaignConfig | null;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  /** Apply a function to the working copy. No-op in view mode. */
  update: (fn: (c: CampaignConfig) => CampaignConfig) => void;
  /** Apply a function to a specific iteration. */
  updateIteration: (iterationId: string, fn: (it: Iteration) => Iteration) => void;
  reset: () => void;
  /** True if working copy differs from the loaded snapshot. */
  isDirty: boolean;
  /** Download the working copy as JSON. */
  downloadJson: () => void;
  /** Copy the working copy JSON to clipboard. */
  copyJson: () => Promise<boolean>;
  /** True after the first persistence has run (avoid hydration overwrite). */
  hydrated: boolean;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const ak = Object.keys(ao);
  const bk = Object.keys(bo);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}

export function useAuthorState(loaded: CampaignConfig | null): AuthorState {
  const [viewMode, setViewModeState] = useState<ViewMode>(loadViewMode);
  const [working, setWorking] = useState<CampaignConfig | null>(() => loadWorking(loaded?.ID));
  const [hydrated, setHydrated] = useState(false);
  const loadedRef = useRef(loaded);

  // When the user loads a different campaign, adopt the working copy from
  // localStorage (if any) for that campaign ID. Only fall back to the loaded
  // snapshot if there's no persisted working copy.
  useEffect(() => {
    loadedRef.current = loaded;
    if (!loaded) {
      setWorking(null);
      setHydrated(true);
      return;
    }
    const persisted = loadWorking(loaded.ID);
    setWorking(persisted ?? loaded);
    setHydrated(true);
  }, [loaded]);

  // Auto-save working copy on every change.
  useEffect(() => {
    if (!hydrated) return;
    if (!working || !working.ID) return;
    if (deepEqual(working, loadedRef.current)) {
      // Working copy is identical to snapshot — clear the persisted copy.
      try { window.localStorage.removeItem(STORAGE_PREFIX + working.ID); } catch { /* ignore */ }
      return;
    }
    saveWorking(working.ID, working);
  }, [working, hydrated]);

  const setViewMode = useCallback((m: ViewMode) => {
    setViewModeState(m);
    saveViewMode(m);
  }, []);

  const update = useCallback((fn: (c: CampaignConfig) => CampaignConfig) => {
    setWorking(prev => (prev ? fn(structuredClone(prev)) : prev));
  }, []);

  const updateIteration = useCallback(
    (iterationId: string, fn: (it: Iteration) => Iteration) => {
      setWorking(prev => {
        if (!prev) return prev;
        const idx = prev.Iterations.findIndex(it => it.ID === iterationId);
        if (idx < 0) return prev;
        const next = structuredClone(prev);
        next.Iterations[idx] = fn(next.Iterations[idx]);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (!loadedRef.current) return;
    setWorking(loadedRef.current);
    try { window.localStorage.removeItem(STORAGE_PREFIX + loadedRef.current.ID); } catch { /* ignore */ }
  }, []);

  const downloadJson = useCallback(() => {
    if (!working) return;
    const blob = new Blob([JSON.stringify(working, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${working.ID || 'campaign-config'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [working]);

  const copyJson = useCallback(async () => {
    if (!working) return false;
    try {
      await navigator.clipboard.writeText(JSON.stringify(working, null, 2));
      return true;
    } catch {
      return false;
    }
  }, [working]);

  // Track the latest loaded snapshot in a ref so the auto-save effect
  // (which can't depend on `loaded` directly without resetting working) reads
  // the most recent value without triggering re-renders.
  // For isDirty, we compare against a separately-tracked snapshot:
  const isDirty = working != null && !deepEqual(working, loaded);

  return {
    loaded,
    working,
    viewMode,
    setViewMode,
    update,
    updateIteration,
    reset,
    isDirty,
    downloadJson,
    copyJson,
    hydrated,
  };
}
