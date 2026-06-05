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
      <header className="app-header">
        <div className="app-header__container max-w-container">
          <a href="/" className="app-header__service-name">Campaign Config Explainer</a>
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

      <footer className="app-footer">
        Internal use only.
      </footer>
    </div>
  );
}

export default App;