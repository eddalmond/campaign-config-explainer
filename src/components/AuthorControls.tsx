import { useState } from 'react';
import { useAuthor } from '../hooks/AuthorContext';
import type { ViewMode } from '../hooks/useAuthorState';

export default function AuthorControls() {
  const { viewMode, setViewMode, isDirty, reset, downloadJson, copyJson, loaded } = useAuthor();
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  if (!loaded) return null;

  const handleCopy = async () => {
    const ok = await copyJson();
    setCopyState(ok ? 'ok' : 'fail');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  return (
    <div className="author-controls">
      <div className="author-controls__mode" role="tablist" aria-label="Editor mode">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'view'}
          className={`tab-btn ${viewMode === 'view' ? 'active' : ''}`}
          onClick={() => setViewMode('view' as ViewMode)}
        >
          View
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'author'}
          className={`tab-btn ${viewMode === 'author' ? 'active' : ''}`}
          onClick={() => setViewMode('author' as ViewMode)}
        >
          Author
        </button>
      </div>

      {viewMode === 'author' && (
        <div className="author-controls__actions">
          {isDirty && (
            <span className="author-controls__dirty" title="Working copy differs from loaded snapshot">
              ● Unsaved changes
            </span>
          )}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={reset}
            disabled={!isDirty}
            title="Discard edits and restore the originally loaded JSON"
          >
            Reset
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleCopy}
            title="Copy the working copy JSON to the clipboard"
          >
            {copyState === 'ok' ? '✓ Copied' : copyState === 'fail' ? '✗ Copy failed' : 'Copy JSON'}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={downloadJson}
            title="Download the working copy as a JSON file"
          >
            Download JSON
          </button>
        </div>
      )}
    </div>
  );
}
