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
    <div className="min-h-screen bg-[#f0f4f5] text-[#212b32] font-sans">
      {/* NHS Header */}
      <header className="bg-[#005eb8] px-4 py-3 border-b-4 border-white">
        <div className="max-w-6xl mx-auto flex items-center gap-6">
          <svg className="w-20 h-8" viewBox="0 0 40 16" aria-hidden="true">
            <path fill="#fff" d="M0 0h40v16H0z" />
            <path fill="#005eb8" d="M3.9 1.5h4.4l2.6 9h.1l1.8-9h3.3l-2.8 13H9l-2.7-9h-.1l-1.8 9H1.1M17.3 1.5h3.6l-1 4.9h4L25 1.5h3.5l-2.7 13h-3.5l1.1-5.6h-4.1l-1.2 5.6h-3.4M37.7 4.4c-.7-.3-1.6-.6-2.9-.6-1.4 0-2.5.2-2.5 1.3 0 1.8 5.1 1.2 5.1 5.1 0 3.6-3.3 4.5-6.4 4.5-1.3 0-2.9-.3-4-.7l.8-2.7c.7.4 2.1.7 3.2.7 1.3 0 2.3-.2 2.3-1.4 0-2-5.1-1.2-5.1-5.1 0-4 3.7-4.5 6.4-4.5 1.2 0 2.7.3 3.5.6" />
          </svg>
          <a href="/" className="text-white font-semibold hover:underline">Explainer</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Campaign Config Explainer</h1>
        <p className="text-[#4c6272] mb-8">
          Load a campaign configuration to visualise the rule evaluation flow — eligibility (F/S), action routing (R/X/Y), cohorts, and actions.
        </p>

        {/* Upload / Paste Card */}
        <div className="bg-white border border-[#d8dde0] p-6 mb-8">
          <div className="mb-4">
            <label className="block font-semibold mb-2">Upload Configuration File (JSON)</label>
            <span className="block text-sm text-[#4c6272] mb-2">Select or drag a campaign configuration JSON file.</span>
            <input
              type="file"
              accept=".json"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="w-full p-2 bg-[#f0f4f5] border-2 border-[#212b32] text-sm"
            />
          </div>

          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-[#005eb8]">Or paste JSON directly</summary>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder='{"CampaignConfig": { ... }}'
              className="w-full p-2 mt-2 border-2 border-[#212b32] font-mono text-sm"
              rows={8}
            />
          </details>

          <div className="flex items-center gap-4">
            <button
              onClick={handlePasteLoad}
              disabled={!rawInput.trim()}
              className="bg-[#007f3b] text-white font-semibold px-5 py-2.5 shadow-[0_4px_0_#00401e] hover:bg-[#00642e] disabled:bg-[#d8dde0] disabled:text-[#768692] disabled:shadow-none transition-all active:translate-y-1 active:shadow-none"
            >
              Load & Explain
            </button>
            {error && <span className="text-[#d81e05] text-sm">{error}</span>}
            {campaignConfig && !error && (
              <span className="text-[#007f3b] text-sm">✓ Loaded: {campaignConfig.Name}</span>
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

      <footer className="bg-[#d8dde0] py-8 mt-12 text-center text-sm">
        <div className="max-w-6xl mx-auto">
          © NHS England. Intended for internal use only.
        </div>
      </footer>
    </div>
  );
}

export default App;