import { useState, useCallback } from 'react';
import type { CampaignConfig } from './types/campaign';
import CampaignOverview from './components/CampaignOverview';
import IterationDetail from './components/IterationDetail';

function App() {
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [currentIterationIndex, setCurrentIterationIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState<string>('');
  // @ts-expect-error - kept for future use
  const [isFileMode, setIsFileMode] = useState<boolean>(false);

  const handleFileLoad = useCallback((content: string) => {
    try {
      const parsed = JSON.parse(content);
      const cc = parsed.CampaignConfig || parsed;
      if (!cc.Iterations || !Array.isArray(cc.Iterations)) {
        throw new Error('Missing Iterations array');
      }
      setCampaignConfig(cc as CampaignConfig);
      setError(null);
      setCurrentIterationIndex(0);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
    }
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    setIsFileMode(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawInput(content);
      handleFileLoad(content);
    };
    reader.readAsText(file);
  }, [handleFileLoad]);

  const handlePasteLoad = useCallback(() => {
    if (!rawInput.trim()) return;
    setIsFileMode(false);
    handleFileLoad(rawInput);
  }, [rawInput, handleFileLoad]);

  const sortedIterations = campaignConfig?.Iterations
    ?.slice()
    .sort((a, b) => (a.IterationDate || '').localeCompare(b.IterationDate || '')) || [];

  return (
    <div className="app-container">
      {/* NHS Header */}
      <header className="nhsuk-header">
        <div className="nhsuk-header__container max-w-container">
          <svg className="nhsuk-logo" viewBox="0 0 40 16" aria-hidden="true">
            <path fill="#fff" d="M0 0h40v16H0z" />
            <path fill="#005eb8" d="M3.9 1.5h4.4l2.6 9h.1l1.8-9h3.3l-2.8 13H9l-2.7-9h-.1l-1.8 9H1.1M17.3 1.5h3.6l-1 4.9h4L25 1.5h3.5l-2.7 13h-3.5l1.1-5.6h-4.1l-1.2 5.6h-3.4M37.7 4.4c-.7-.3-1.6-.6-2.9-.6-1.4 0-2.5.2-2.5 1.3 0 1.8 5.1 1.2 5.1 5.1 0 3.6-3.3 4.5-6.4 4.5-1.3 0-2.9-.3-4-.7l.8-2.7c.7.4 2.1.7 3.2.7 1.3 0 2.3-.2 2.3-1.4 0-2-5.1-1.2-5.1-5.1 0-4 3.7-4.5 6.4-4.5 1.2 0 2.7.3 3.5.6" />
          </svg>
          <a href="/" className="nhsuk-header__service-name">Explainer</a>
        </div>
      </header>

      <main className="main-content max-w-container">
        <h1>Campaign Config Explainer</h1>
        <p className="page-description">
          Load a campaign configuration to visualise the rule evaluation flow — eligibility (F/S), action routing (R/X/Y), cohorts, and actions.
        </p>

        {/* Upload / Paste Card */}
        <div className="card card--upload">
          <div className="form-group">
            <label className="form-label">Upload Configuration File (JSON)</label>
            <span className="form-hint">Select or drag a campaign configuration JSON file.</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="file-input"
            />
          </div>

          <details>
            <summary>Or paste JSON directly</summary>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder='{"CampaignConfig": { ... }}'
              className="text-area"
              rows={8}
            />
          </details>

          <div className="message-container">
            <button
              onClick={handlePasteLoad}
              disabled={!rawInput.trim()}
              className="btn btn--primary"
            >
              Load &amp; Explain
            </button>
            {error && <span className="message-error">{error}</span>}
            {campaignConfig && !error && (
              <span className="message-success">✓ Loaded: {campaignConfig.Name}</span>
            )}
          </div>
        </div>

        {/* Main Output */}
        {campaignConfig && (
          <>
            <CampaignOverview
              config={campaignConfig}
              onIterationSelect={setCurrentIterationIndex}
            />
            {sortedIterations[currentIterationIndex] && (
              <IterationDetail
                iteration={sortedIterations[currentIterationIndex]}
                actionsMapper={sortedIterations[currentIterationIndex].ActionsMapper}
              />
            )}
          </>
        )}
      </main>

      <footer className="nhsuk-footer">
        © NHS England. Intended for internal use only.
      </footer>
    </div>
  );
}

export default App;