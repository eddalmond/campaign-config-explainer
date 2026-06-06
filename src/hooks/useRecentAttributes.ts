import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'campaign-explainer:recent-attributes';
const MAX_RECENT = 8;

type RecentEntry = { name: string; level: string; target: string };

function loadRecent(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function saveRecent(entries: RecentEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}

/**
 * Tracks which attributes the user has recently used in rule editors, so
 * the dropdown can sort them to the top. Persisted to localStorage across
 * sessions (per-browser, not per-campaign).
 *
 * "Recent" here means: most recently *saved* rule wins, then by recency.
 * We only persist on save, not on every keystroke — that way an aborted
 * edit doesn't pollute the list.
 */
export function useRecentAttributes() {
  const [recent, setRecent] = useState<RecentEntry[]>(() => loadRecent());

  // Cross-tab sync.
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setRecent(loadRecent());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const remember = useCallback((name: string, level: string, target: string) => {
    if (!name || !level) return;
    setRecent(prev => {
      const next: RecentEntry[] = [
        { name, level, target: target || '' },
        ...prev.filter(e => !(e.name === name && e.level === level && (e.target || '') === (target || ''))),
      ].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, []);

  /**
   * Sort a list of attribute options so the recently-used ones (matching
   * the current level + target) appear at the top, in recency order.
   * Everything else stays in its original order.
   */
  const sortByRecency = useCallback(
    <T extends { name: string; level: string; target?: string }>(options: T[]): T[] => {
      if (recent.length === 0) return options;
      const recencyIndex = new Map<string, number>();
      for (let i = 0; i < recent.length; i++) {
        const e = recent[i];
        recencyIndex.set(`${e.level}:${e.target || ''}:${e.name}`, i);
      }
      return [...options].sort((a, b) => {
        const ak = `${a.level}:${a.target || ''}:${a.name}`;
        const bk = `${b.level}:${b.target || ''}:${b.name}`;
        const ai = recencyIndex.get(ak);
        const bi = recencyIndex.get(bk);
        if (ai == null && bi == null) return 0;
        if (ai == null) return 1;
        if (bi == null) return -1;
        return ai - bi;
      });
    },
    [recent]
  );

  return { recent, remember, sortByRecency };
}
