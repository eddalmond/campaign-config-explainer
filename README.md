# Campaign Config Explainer

A visual editor + explainer for the rule-based config that drives NHS-style
vaccination / screening campaigns. Loads a campaign config JSON and shows you,
in plain English, what each iteration will do — who it filters out, who it
routes where, and why.

- **Visualise** the evaluation flow (F/S eligibility, R/X/Y action routing)
- **Explain** every rule in plain English at the top of the editor
- **Edit** rules, cohorts, actions, and iterations with inline-editable cells
- **Validate** the config against the known attribute/operator catalog
- **Compare** iterations side-by-side
- **Diff** the working copy against the loaded snapshot
- **Export** the working copy as JSON or copy it to the clipboard

Built for internal use by people who already understand the rule engine —
this is a tool for inspecting and editing configs, not a no-code rule builder.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run lint
```

The app is a static SPA — the Dockerfile ships `dist/` behind nginx.

## Usage

1. Click **Try a sample** to load a minimal config that exercises every rule
   type, attribute level, and template token.
2. Or **upload** / **paste** your own config JSON. Two top-level shapes are
   accepted: `{ "CampaignConfig": { ... } }` (the API payload) or the inner
   object directly.
3. Toggle **Author mode** in the header to enable editing. Edits go to a
   working copy that's persisted in `localStorage` per-campaign; the loaded
   snapshot is preserved for diff and reset.
4. The plain-English summary at the top of each iteration translates the
   rules below it into sentences. Edit a rule (inline or in the drawer) and
   the summary updates.

## Architecture

```
src/
  App.tsx                      Top-level layout, file/paste/sample loaders
  main.tsx                     Entry point
  index.css                    Design tokens + all component styles
  components/                  ~25 focused components (table, drawer, editor, etc.)
  hooks/
    useAuthorState.ts          Working-copy + persistence + isDirty
    useRecentAttributes.ts     Recently-used attribute memory (per iteration)
    useTheme.ts                Light / dark mode
  utils/
    explain.ts                 Plain-English rule + operator explanations
    validation.ts              Config validation against the catalog
    ruleFilter.ts              Type/priority/search filter state shape
    diff.ts                    Working vs. loaded JSON diff
    sortWithIndex.ts           Stable sort with original-index lookup
    templates.ts               Template-token expansion
  data/
    catalog.ts                 Known attributes, operators, action types
    sampleConfig.ts            Sample + blank configs
  types/campaign.ts            Domain types
docs/
  ux-survey.md                 Landscape survey + initial recommendations
  ux-review-and-improvement-plan.md   Deep audit + prioritised roadmap
  domain-conventions.md        Domain model conventions
  pr-10-simulator-design.md    Design notes for the (planned) simulator
```

State flow:
- `App.tsx` owns the loaded `CampaignConfig` snapshot.
- `useAuthorState` derives a mutable `working` copy from it, persists to
  `localStorage`, and exposes imperative update helpers.
- Most editor → read-only communication happens via `window`-dispatched custom
  events (`campaign-explainer:open-new-rule`, `campaign-explainer:open-cohort`,
  `campaign-explainer:edit-section`, `campaign-explainer:open-action`). This
  keeps the read-only tables free of editor-state plumbing.

## Editing model

- **Inline cells** (most rule-table columns): click to edit, Enter to commit,
  Esc to cancel, Tab to move on. Validates on commit; errors stay in the
  cell with a red dot.
- **Drawers** (campaign metadata, iteration metadata, full rule editor,
  cohort editor, action editor, JSON preview, diff, compare iterations):
  for changes that don't fit a single cell — multi-field forms, complex
  validation, large payloads.
- **Tabs** (eligibility / action / actions-mapper / rules-mapper): one per
  concern. The "+ Add rule" button in the tab nav is always available in
  author mode.

## Deployment

Multi-stage Dockerfile (node 20-alpine → nginx-alpine) listens on `$PORT`
(default 8080). `railway.json` configures the Railway deployment.

```bash
docker build -t campaign-explainer .
docker run -p 8080:8080 campaign-explainer
```

## Status

Active development. Recent shipped work includes the inline-editable rule
tables, plain-English explanations, validation panel, fallback-chain
diagram, sticky section nav, and dark mode.

Roadmap and prioritised improvements are tracked in
[`docs/ux-review-and-improvement-plan.md`](docs/ux-review-and-improvement-plan.md).

## Conventions

- NHS colour palette, Inter for UI, JetBrains Mono for code
- No external state library — props + a small set of context providers
- CSS lives in a single `index.css` with a token block at the top
- Components are functional, no class components, no UI library
