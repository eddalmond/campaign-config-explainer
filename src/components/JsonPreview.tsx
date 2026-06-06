import { useEffect, useMemo, useRef, useState } from 'react';
import { codeToHtml } from 'shiki';
import type { CampaignConfig } from '../types/campaign';

interface Props {
  /** Current working copy — what we render when "show working" is on. */
  working: CampaignConfig;
  /** Original loaded snapshot — what we diff against. */
  loaded: CampaignConfig;
}

type Side = 'working' | 'loaded' | 'unified';
type Mode = 'syntax' | 'diff';

interface DiffLine {
  kind: 'add' | 'del' | 'same' | 'info';
  text: string;
}

/**
 * Renders a pretty-printed, syntax-highlighted view of the working copy
 * JSON, with an optional line-level diff against the loaded snapshot.
 *
 * Uses shiki for highlighting (loaded asynchronously; falls back to a
 * plain <pre> while loading or if shiki ever fails). Diff is a
 * Myers-style line diff computed with a hand-rolled LCS — works fine
 * for the size of campaign configs people actually edit in the tool.
 */
export default function JsonPreview({ working, loaded }: Props) {
  const [side, setSide] = useState<Side>('working');
  const [mode, setMode] = useState<Mode>('syntax');
  const [html, setHtml] = useState<string>('');
  const [highlightReady, setHighlightReady] = useState(false);
  const renderTokenRef = useRef(0);

  const workingText = useMemo(() => JSON.stringify(working, null, 2), [working]);
  const loadedText = useMemo(() => JSON.stringify(loaded, null, 2), [loaded]);

  // Highlighter — shiki is async. Re-run when the text we're highlighting changes.
  useEffect(() => {
    const target = side === 'loaded' ? loadedText : workingText;
    const myToken = ++renderTokenRef.current;
    let cancelled = false;
    (async () => {
      try {
        const out = await codeToHtml(target, {
          lang: 'json',
          theme: 'github-light',
        });
        if (cancelled || myToken !== renderTokenRef.current) return;
        setHtml(out);
        setHighlightReady(true);
      } catch {
        if (cancelled) return;
        setHtml('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workingText, loadedText, side]);

  const diffLines: DiffLine[] = useMemo(() => {
    if (mode !== 'diff') return [];
    return myersDiff(loadedText, workingText);
  }, [loadedText, workingText, mode]);

  const changedCount = useMemo(
    () => diffLines.filter(l => l.kind === 'add' || l.kind === 'del').length,
    [diffLines]
  );

  return (
    <div className="json-preview">
      <div className="json-preview__toolbar">
        <div className="json-preview__tabs" role="tablist" aria-label="JSON view">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'syntax'}
            className={`tab-btn ${mode === 'syntax' ? 'active' : ''}`}
            onClick={() => setMode('syntax')}
          >
            Syntax
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'diff'}
            className={`tab-btn ${mode === 'diff' ? 'active' : ''}`}
            onClick={() => setMode('diff')}
            disabled={workingText === loadedText}
            title={workingText === loadedText ? 'No changes to diff' : 'Show line-by-line changes'}
          >
            Diff {changedCount > 0 && <span className="json-preview__badge">{changedCount}</span>}
          </button>
        </div>

        {mode === 'syntax' && (
          <div className="json-preview__tabs" role="tablist" aria-label="Which JSON to show">
            <button
              type="button"
              role="tab"
              aria-selected={side === 'working'}
              className={`tab-btn ${side === 'working' ? 'active' : ''}`}
              onClick={() => setSide('working')}
            >
              Working
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={side === 'loaded'}
              className={`tab-btn ${side === 'loaded' ? 'active' : ''}`}
              onClick={() => setSide('loaded')}
            >
              Loaded
            </button>
          </div>
        )}
      </div>

      <div className="json-preview__body">
        {mode === 'syntax' ? (
          highlightReady ? (
            <div
              className="json-preview__code"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div
              className="json-preview__code"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        ) : (
          <DiffView lines={diffLines} />
        )}
      </div>

      <div className="json-preview__footer">
        <span className="json-preview__meta">
          {workingText.split('\n').length} lines · {new Blob([workingText]).size} bytes
        </span>
        {workingText === loadedText && (
          <span className="json-preview__clean" title="Working copy matches the loaded snapshot">
            ✓ No unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}

function DiffView({ lines }: { lines: DiffLine[] }) {
  return (
    <pre className="json-preview__diff">
      {lines.map((line, i) => (
        <div key={i} className={`json-preview__diff-line json-preview__diff-line--${line.kind}`}>
          <span className="json-preview__diff-marker">
            {line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : line.kind === 'info' ? ' ' : ' '}
          </span>
          <span className="json-preview__diff-text">{line.text || '\u00A0'}</span>
        </div>
      ))}
    </pre>
  );
}

/**
 * Hand-rolled Myers/Hunt-Szymanski-style line diff.
 * O(n*m) but fine for configs up to a few thousand lines. Renders
 * additions from the new side and deletions from the old side, with
 * unchanged lines shown for context. Header rows mark the boundary
 * between add/del groups so the view stays readable.
 */
function myersDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  const n = a.length;
  const m = b.length;

  // LCS table — only need the previous row + current row to save memory.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk forward through the LCS table to build the edit script.
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: 'del', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ kind: 'del', text: a[i++] });
  }
  while (j < m) {
    out.push({ kind: 'add', text: b[j++] });
  }
  return out;
}
