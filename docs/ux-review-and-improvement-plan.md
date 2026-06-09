# Campaign Config Explainer — UX Review & Improvement Plan

**Date:** 2026-06-09
**Scope:** Deep review of UI/UX against current best practice. Code-grounded (read against
the source at this revision), not theoretical.

> **TL;DR** The repo is in much better shape than "the UI is a little clunky" suggests. The
> big landscape-survey recommendations A (rule-sentence), B (iteration-sentence), D
> (recent-attributes), and F (inline editable cells) are **already implemented and working**.
> Only C (decision-table editor) and E (person simulator) are absent. The remaining
> friction lives in three places: (1) **information density / cognitive load** in the
> iteration view, (2) **destructive flows** that lean on `window.confirm`/`alert`, and
> (3) **a handful of accessibility / keyboard gaps** in the most-touched surface
> (the inline editable cell). The plan below prioritises the high-leverage work and
> keeps the survey recommendations that haven't shipped on the roadmap.

---

## 1. What's actually working

Before fixing, a quick audit of what's already good — to avoid spending PR budget on
"polish" that the user can't perceive.

| Area | Status | Evidence |
|---|---|---|
| Plain-English rule summaries (A) | ✅ Shipped | `rule-sentence` CSS + `explain.ts` + `RuleEditor.tsx` |
| Iteration plain-English summary (B) | ✅ Shipped | `iteration-sentence` block in `IterationDetail.tsx` |
| Recent-attribute memory (D) | ✅ Shipped | `hooks/useRecentAttributes.ts` |
| Inline editable cells (F) | ✅ Shipped | `InlineEditableCell.tsx` + used in `EligibilityRulesTable`, `ActionRulesTable` |
| Sticky section nav | ✅ Shipped | `StickySectionNav.tsx` with active-section highlighting |
| Validation panel | ✅ Shipped | `ValidationPanel.tsx` with severity + filter tabs |
| Operator explanations | ✅ Shipped | `explainOperator` in `utils/explain.ts`, rendered under comparator |
| Fallback chain visualisation | ✅ Shipped | `FallbackChainDiagram.tsx` — reads top-to-bottom, shows default + try-once |
| JSON preview with diff | ✅ Shipped | `JsonPreview.tsx` with red/green line diff + working-vs-loaded badge |
| Compare iterations | ✅ Shipped | `CompareIterationsDrawer.tsx` + `IterationDiffView.tsx` |
| Dark mode | ✅ Shipped | Token overrides in `index.css`, persisted via `useTheme` |
| Working copy + localStorage | ✅ Shipped | `hooks/useAuthorState.ts` with isDirty badge, download, copy, reset |
| Duplicate / delete iteration | ✅ Shipped | In `CampaignOverview.tsx` (author mode) |
| Template-token chips | ✅ Shipped | `TemplateChips.tsx`, used in iteration date + markdown preview |

**Net:** the "clunky" framing is generous. The architecture is solid, the visual
language is consistent (NHS colour palette, Inter, status badges, data-items, table
styles), and the most-recommended UX patterns are in place.

## 2. Where the friction actually is

Six concrete pain points, ordered by user impact.

### P1. Too much visible at once on the iteration page

`IterationDetail.tsx` is **665 lines** and renders six labelled sections (Iteration,
Cohorts, Rules, Validation, Diagrams, Routing) stacked vertically. Sticky nav helps,
but the sections are long, several contain sub-headings + prose + data + diagrams, and
there is no visual "you are here" indicator on the section itself. Users have to
scroll-past-stuff to find what they need, then scroll back.

**Symptoms:**
- New users don't know whether to look at "Rules" or "Diagrams" first.
- The plain-English iteration sentence (a great summary) is at the top, but it's
  visually similar to the data-items below it, so it gets lost in the noise.
- Validation results (often the most-urgent thing to look at) are **section 4** of
  6, not visible above the fold.

**Fixes (in priority order):**

1. **Promote validation to the top of author mode.** When the user is in author mode
   and the validation panel has any errors, surface a compact `ValidationSummary`
   card right under the iteration sentence: e.g. "2 errors, 1 warning — see
   section 4 for details" with a "Jump to validation" button. The full panel still
   lives in section 4 — this is just an alert badge.
2. **Add a "Card position" indicator** to each section: a small dot or count badge
   on the section heading in the sticky nav, so users know which sections have
   content. (Empty cohorts → grey dot; populated + valid → green; populated +
   validation errors → red.)
3. **Collapse-by-default for low-priority sections in author mode.** "Diagrams" and
   "Routing" are reference material, not editing surface. Collapsing them by
   default with a clear "Show diagrams" toggle (not a `<details>` — the styling
   needs to match the rest of the app) would cut the initial scroll length roughly
   in half. The "sticky section nav" can carry a "Diagrams (collapsed)" hint.
4. **Visually elevate the iteration-sentence.** The plain-English summary should
   look like a hero block, not just a tinted card. Suggestions:
   - Larger text (1.05–1.1rem, not 0.95rem)
   - A subtle drop shadow or 1-px border tint
   - "What's this?" tooltip on the label, since new users may not realise the
     block is a generated translation of the rules below
   - (Optional) a "Show as: Plain English / Code" toggle that swaps the sentence
     for the equivalent rule list. Useful for technical review.

**Effort:** 1–2 PRs. Low risk, high day-to-day impact.

### P2. Destructive flows rely on `window.confirm` and `alert`

Five sites use native dialogs (`grep` output in the audit):
- `CampaignOverview.tsx:59` — `alert("Cannot delete the only remaining iteration...")`
- `CampaignOverview.tsx:62` — `confirm("Delete iteration...")`
- `AuthorPanel.tsx:197` — same alert
- `AuthorPanel.tsx:200` — same confirm (duplicated)
- `CohortEditor.tsx:42` — `confirm("Delete this cohort?...")`
- `RuleEditor.tsx:185` — `confirm("Delete this rule?")`
- `ActionMappingEditor.tsx:60` — `confirm("Delete action...")`

**Why this matters:**
- Native dialogs **block the JS thread** and look out of place next to the
  otherwise-polished drawer-based UI.
- The two `alert("Cannot delete the only remaining iteration...")` calls in
  different components are **duplicated prose** — a bug-magnet (one gets fixed,
  the other drifts).
- They are not themable, so the rest of the dark-mode / NHS-styled experience
  breaks visually the moment you delete something.
- They are not localised, not keyboard-navigable beyond the OS defaults, and not
  announced to screen readers in any way that ties to the rest of the UI's
  `role="alert"` discipline.

**Fix:** introduce a small `useConfirm` / `<ConfirmDialog>` primitive (probably
a `Drawer` variant, or a centred modal — both already have the styling
infrastructure; just need a thin wrapper that returns a Promise<boolean>). Then
swap all 7 sites. As a bonus, the "cannot delete the only iteration" check can
return a *non-modal* inline state on the Delete button itself (disabled with a
tooltip, or a red tooltip explaining why) instead of an alert.

**Effort:** 1 PR. ~3–4 hours including the disabled-with-tooltip refactor.

### P3. The Iteration card is a single `<div className="card">` with section IDs

`IterationDetail.tsx` wraps **everything** in one `.card`. Each section (`<div id="sec-…">`)
is inside, and the sticky nav jumps between them. This causes two issues:

1. **Card-level visual hierarchy is lost.** Because there's one big card, the
   section headings can't use the lighter `.section-heading` style — they all look
   equal. There's no "section 1" / "section 2" feel, just a long page.
2. **The sticky nav blurs in over the card border**, which looks unfinished because
   it has its own background (`rgba(255,255,255,0.92)`) but the card edge is
   opaque white.

**Fix:** split each major section into its own `.card`. Smaller cards = clearer
visual structure = easier scanning. Side benefits: each section can be collapsed
independently (P1 #3), validation errors don't get hidden behind other content,
and the loading skeleton (if you add one) becomes per-section.

**Effort:** 1 PR, mechanical refactor. ~2 hours.

### P4. Accessibility gaps in `InlineEditableCell` (the most-touched surface)

The cell is used in 8 columns × N rows. Most users will spend more time here than
anywhere else in the app. The current implementation has three issues:

1. **Click target is the value text, not the cell.** Click the "—" (em dash for
   empty value) — nothing happens. The `<button>` has the value inside it but
   there's no padding, so it's ~12 px wide and 16 px tall on a 16 px base font.
   Fitts's law says this is a miss-rate waiting to happen.
2. **No visible focus state on the read-only button.** A keyboard user tabbing
   through gets the browser default outline, which is fine, but the cell's
   `.inline-cell--read-only` style only shows the dashed border on `:hover`. There's
   no `:focus-visible` style.
3. **Error dot has `title=` but no `aria-label`.** The `<span>` with the
   `.inline-cell__error-dot` class has a `title` attribute, but assistive tech
   doesn't always announce `title` on non-focusable elements. Should have
   `aria-label` or be wrapped in a focusable element.

**Fixes (small, contained):**
- Add a minimum hit area: `.inline-cell--read-only { min-width: 1.5rem;
  padding: 0.15rem 0.35rem; }` (already partly there — verify) and a clearer
  focus ring.
- Add `.inline-cell--read-only:focus-visible { outline: 2px solid var(--primary);
  outline-offset: 1px; }` (currently has `:focus` which fires for both mouse
  and keyboard — use `:focus-visible`).
- Wrap the error dot in a `<span role="status" aria-live="polite">` or add
  `aria-label` directly. The existing `role="alert"` on the message text is
  good — keep that. Just need the visual dot to also be announced.

**Effort:** 1 small PR. ~1 hour including browser-tab verification.

### P5. Iteration picker is a `<select>` with N options as plain text

In `CampaignOverview.tsx`, the iteration picker is a native `<select>` that shows
`Name — Date (Type)`. With 5+ iterations, users scan by date primarily. The
dropdown is unsearchable, doesn't group by year, and truncates long names
silently.

**Fix:** a lightweight combobox (`<input list="…">` + `<datalist>` for ~1 hour
of work, or a small headless listbox if you want keyboard arrow navigation).
The plain-English survey mentions Airtable / Notion patterns; the right move here
is probably the "search by date or name" combobox with the iteration's status
badge next to it. Mark as nice-to-have — `<select>` is functional, just not
delightful with many iterations.

**Effort:** 2–3 hours for a combobox. **Or** leave it for now and revisit when
someone has >10 iterations.

### P6. The "+ Add Rule" affordance placement (carried over from the survey)

The survey's C/F section noted: "*the 'Add rule' button is in the AuthorPanel
footer (far from the rule list); the cohorts table has an Edit button per row.
We should normalise.*" — this is **still partially true**. In author mode, the
"Manage rules" button is in the section-heading-row of the rules section, but
the *primary* "add" action is wired to a `window.addEventListener('campaign-explainer:open-new-rule')`
event that the AuthorPanel listens to. There's no visible "+ Add rule" button
anywhere on the rules table itself.

**Fix:** add a small "+ Add rule" button at the top-right of the rules
`tab-content`, right next to the "Showing N of M rules" count. Use the same
custom-event dispatch as the existing handler so AuthorPanel picks it up
without changes.

**Effort:** 30 minutes. Single component edit.

## 3. Survey recommendations not yet shipped

These are the two big ones from `docs/ux-survey.md` that haven't landed:

### C. Decision-table editor for bulk operations (not started)

> "~6-8 hours" per the survey.

The current rule tables already do most of this (inline edit, type filter,
priority range, full-text search). The remaining gap is **multi-row operations**:
- "Set RuleStop='Y' for all S rules at priority 100"
- "Bump priority of all R rules by 10"
- "Replace CommsRouting for all rules pointing to `INFO_TEXT` with `INFO_TEXT_V2`"

**Recommendation:** ship a small set of bulk actions on the rules tab toolbar:
- "Set RuleStop for filtered rules…" → small popover with a confirm
- "Bump priorities by ±N" → small inline form
- "Replace routing code" → find-and-replace with scope limited to filtered set

These can all be modal-free: small inline forms with their own commit button.
Each one should be undoable (push to a small undo stack, Ctrl-Z to roll back the
last bulk op — `useAuthorState` already tracks the working copy so the
infrastructure is there).

**Effort:** ~6 hours, one PR. The data model already supports it; the work is
all UI.

### E. Person simulator (~16-20 hours — out of scope for this pass)

Survey called it the "killer feature." Still a big lift (needs a mock of the
DDB attributes, the rule evaluation logic, and a way to paste a person
record). Keep on the roadmap; not blocking.

## 4. Smaller polish items (a single "UI tidy" PR)

These are all 5–15 minute changes, would benefit from a single PR so the diff
is reviewable:

1. **README.md is the default Vite scaffold.** Replace it with a real project
   README (what it does, how to run, architecture diagram, screenshot/GIF).
   This is the first thing new contributors see.
2. **`<html lang="en">` is set, but no `aria-label` on the header `<nav>` or
   `<main>`.** Trivial fix; one line each.
3. **`<title>` is "Campaign Config Explainer"** — good. But on the empty state
   (no config loaded), consider updating the doc title to reflect the state
   ("Campaign Config Explainer — load a config to begin"). Helps browser
   history and tab labelling.
4. **The `data-grid` for iteration status text doesn't show all three values
   side-by-side on mobile.** It uses `grid-template-columns: 1fr` below 768 px,
   which is correct, but on phones the colour-coded left border can be hard to
   see against the page background. Add a small `font-weight: 600` to the
   labels on mobile.
5. **Mermaid dark-mode invert** uses `filter: invert(0.92) hue-rotate(180deg)`,
   which is fragile (Mermaid's own theme system is more reliable). When
   Mermaid is upgraded, this should switch to Mermaid's `theme: 'dark'`
   integration. Tracked separately.
6. **Cohort table `key={i}`** in `IterationDetail.tsx:224` — should be
   `key={c.CohortLabel ?? i}`. Currently, editing a cohort's CohortLabel would
   cause React to lose the row's state. (It works because the table is
   read-only-ish, but it's a latent bug.)
7. **Iteration sentence key** in `IterationDetail.tsx:123` uses `key={i}` —
   fine here because the list is a deterministic re-render of `explainIteration`
   output, but `key={s}` is safer.

## 5. What's not worth doing

Carried over from the survey (still good calls):

- **No schema-driven form generation.** The cost-benefit doesn't work for
  one-role, one-schema apps.
- **No drag-and-drop rule ordering.** Priority + inline edit is sufficient.
- **No full visual-programming redesign.** Scratch/Node-RED are for imperative
  logic; this is declarative. The form-on-top-of-visualisation pattern is
  correct.

## 6. Recommended sequencing

| Sprint | Work | Why this order |
|---|---|---|
| **Now (1 PR)** | UI tidy: README, P4 a11y fixes, P6 inline "Add rule" button, key={i}→key={c.CohortLabel} | Low risk, surfaces in PR review, no design decisions needed |
| **Next (1 PR)** | P2: replace `confirm`/`alert` with `useConfirm` primitive. 5 sites migrated. | High-leverage consistency fix; unblocks future "destructive action" work |
| **Next (1–2 PRs)** | P1: validation summary card at top, "card-per-section" split, collapse-by-default for Diagrams/Routing. P3 falls out of this for free. | The structural change; do this once and benefit every future iteration of the page |
| **Then (1 PR)** | P5 iteration combobox, IF the user has >5 iterations in practice | Defer until there's evidence it's a problem |
| **Later (1 PR)** | C: bulk operations on filtered rule set | The biggest missing feature in the survey. Defer until P1–P5 are in, so the bulk ops live in the new per-section layout |
| **Roadmap** | E: person simulator | 16-20 hours, needs design + DDB mock. Schedule when there's bandwidth. |

## 7. How to verify the plan worked

After each PR, do a quick "5-second test" with the loaded sample config:

1. Can a new user, given only the page description, find the validation panel
   without scrolling more than 2 screens? (Validates P1.)
2. Can a user delete a cohort without seeing a native browser dialog?
   (Validates P2.)
3. Does tabbing through the rule table show a visible focus ring on every
   editable cell? (Validates P4.)
4. After all PRs land: does the iteration view fit in ~3 screens of useful
   content (Iteration + Cohorts + Rules tabs) with Diagrams/Routing collapsed?

## 8. Open questions for Edd

1. **What does the team look like?** "Internal use only" in the footer
   suggests a small team. The bulk-ops (C) is only worth the 6 hours if
   more than one person is editing configs in anger. If it's just you,
   bulk-ops is a "maybe later."
2. **Is there a real-world config with >20 rules / >5 iterations?** That
   decides whether the iteration combobox (P5) is a real pain point or
   a hypothetical one.
3. **Are rules being authored in a code review workflow, or live in the
   app?** That determines whether the JSON preview with diff is the
   "source of truth" or just a nice-to-have. If it's the former, the
   copy/download affordances deserve more screen real estate.

---

*Plan generated 2026-06-09 against the repo at the current main branch. Re-run
the audit after each PR to keep the "what's working" table honest.*
