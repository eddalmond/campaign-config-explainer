import { useState, useCallback } from 'react';
import type { CampaignConfig } from './types/campaign';
import { useTheme } from './hooks/useTheme';
import { useAuthorState } from './hooks/useAuthorState';
import { AuthorContext } from './hooks/AuthorContext';
import { SAMPLE_CONFIG, BLANK_CONFIG } from './data/sampleConfig';
import CampaignOverview from './components/CampaignOverview';
import IterationDetail from './components/IterationDetail';
import StickySectionNav from './components/StickySectionNav';
import ThemeToggle from './components/ThemeToggle';
import AuthorControls from './components/AuthorControls';

function App() {
  const { theme, toggleTheme } = useTheme();
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig | null>(null);
  const [currentIterationIndex, setCurrentIterationIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState<string>('');

  const author = useAuthorState(campaignConfig);

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
    handleFileLoad(rawInput);
  }, [rawInput, handleFileLoad]);

  const handleLoadSample = useCallback(() => {
    handleFileLoad(JSON.stringify(SAMPLE_CONFIG));
  }, [handleFileLoad]);

  const handleLoadBlank = useCallback(() => {
    handleFileLoad(JSON.stringify(BLANK_CONFIG));
  }, [handleFileLoad]);

  // The iteration we display is the one from the working copy in author mode
  // (so edits show up immediately), or the loaded snapshot in view mode.
  const displayConfig = author.working ?? campaignConfig;
  const sortedIterations = displayConfig?.Iterations
    ?.slice()
    .sort((a, b) => (a.IterationDate || '').localeCompare(b.IterationDate || '')) || [];

  return (
    <AuthorContext.Provider value={author}>
      <div className="app-container">
        <header className="app-header">
          <div className="app-header__container max-w-container">
            <a href="/" className="app-header__service-name">Campaign Config Explainer</a>
            <div className="app-header__spacer" />
            <AuthorControls />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        <main className="main-content max-w-container">
          <h1>Campaign Config Explainer</h1>
          <p className="page-description">
            Load a campaign configuration to {author.viewMode === 'author' ? 'edit' : 'visualise'} the rule evaluation flow — eligibility (F/S), action routing (R/X/Y), cohorts, and actions.
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
              {displayConfig && !error && (
                <span className="message-success">✓ Loaded: {displayConfig.Name}</span>
              )}
            </div>

            <div className="quick-start">
              <span className="quick-start__label">Or start from:</span>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleLoadSample}
                title="Load a minimal config that exercises every rule type, attribute level, and template token. Useful for exploring the tool."
              >
                Try a sample
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={handleLoadBlank}
                title="Load an empty config with one iteration and no rules, cohorts, or actions."
              >
                Blank config
              </button>
            </div>
          </div>

          {/* Main Output */}
          {displayConfig && (
            <>
              <CampaignOverview
                config={displayConfig}
                currentIterationIndex={currentIterationIndex}
                onIterationSelect={setCurrentIterationIndex}
              />
              {sortedIterations[currentIterationIndex] && (
                <>
                <StickySectionNav sections={[
                  { id: 'sec-campaign', label: 'Campaign' },
                  { id: 'sec-iteration', label: 'Iteration' },
                  { id: 'sec-cohorts', label: 'Cohorts' },
                  { id: 'sec-rules', label: 'Rules' },
                  { id: 'sec-validation', label: 'Validation' },
                  { id: 'sec-diagrams', label: 'Diagrams' },
                  { id: 'sec-routing', label: 'Routing' },
                ]} />
                <IterationDetail
                  iteration={sortedIterations[currentIterationIndex]}
                  actionsMapper={sortedIterations[currentIterationIndex].ActionsMapper}
                  campaignContext={displayConfig ? {
                    StartDate: displayConfig.StartDate,
                    EndDate: displayConfig.EndDate,
                    DefaultCommsRouting: displayConfig.DefaultCommsRouting,
                  } : undefined}
                />
                </>
              )}
            </>
          )}
        </main>

        <footer className="app-footer">
          Internal use only.
        </footer>
      </div>
    </AuthorContext.Provider>
  );
}

export default App;
