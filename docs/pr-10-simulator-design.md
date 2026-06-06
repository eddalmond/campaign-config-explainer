# PR-10 Simulator — research + design notes

## Best-practice research

### Drools (Oscilar blog, 2026)
- The standard "fact + working memory + agenda" model — the engine
  inserts facts (data) into working memory, matches against rules, fires
  the matching ones, and produces a trace.
- Source objects (facts) are the "data" the rules run against. They have
  a strict type.
- The "decision trace" is the audit log: which rules fired, in what
  order, on which facts.
- Key insight: "a modern BRMS needs a feature/knowledge service that
  accepts facts in a common format" — i.e. the simulator should accept
  a single flat person record, not 10 separate DDB queries.

### Code Effects (decision-automation-engine.com)
- Two rule types: evaluation (returns true/false) and execution (sets
  fields / calls methods). For our use case, every rule is evaluation
  + optionally a routing code.
- "Reusable rules" — named rules that can be called as if they were
  Booleans. For us, this maps to the AND-group pattern (same Type +
  Priority + Name).
- "Short-circuit evaluation" — by default, the engine stops at the
  first matching priority group. We do this (the guide is explicit).
- "Evaluation parameters" — control short-circuiting per ruleset.
  We can offer a "long-evaluate" mode for diagnostics (run every
  rule and show what would have happened) — but it's a nice-to-have.

### Drools' Audit Agenda Event Listener (StackOverflow, drools)
- The right way to debug "why didn't this rule fire?" is to listen
  to the agenda events. We can do the equivalent by walking every
  rule and emitting a per-rule pass/fail record.

### Decision Traces (Streamkap, 2026)
- For AI agents: capture (1) which rules fired, (2) confidence scores,
  (3) which policy constraints were evaluated. Translate to our domain:
  (1) which F/S/R/X/Y rules fired, (2) priority order, (3) which
  cohort they were scoped to.

### The "Conversational Explainability" angle (Springer 2020)
- The paper argues that users trust systems more when they can ask
  follow-up questions: "why didn't THIS rule fire?", "what if the
  comparator was -20 instead of -25?". Implication: our trace
  should be browsable, not just a single pass/fail result.

## Synthesis for our v1

We have the data. The API receives a single composite record per
person evaluation:

```json
{
  "person": {
    "NHS_NUMBER": "...",
    "DATE_OF_BIRTH": "19550101",
    "GENDER": "...",
    "POSTCODE": "...",
    "ICB_OF_RESIDENCE": "...",
    "CARE_HOME_FLAG": "Y",
    "DE_FLAG": "N",
    "13Q_FLAG": "N"
  },
  "targets": {
    "RSV": {
      "LAST_SUCCESSFUL_DATE": "20200101",
      "BOOKED_APPOINTMENT_DATE": "20260601",
      "BOOKED_APPOINTMENT_PROVIDER": "NBS"
    }
  },
  "cohortMembership": ["rsv_75to79_plus1day", "care_home_residents_older_adults"]
}
```

The simulator:
1. User pastes/edits this record (with presets for "elderly person in
   care home", "young adult with no history", etc.).
2. We evaluate the iteration's rules against the record.
3. We show a step-by-step trace, plus a final decision.

## v1 scope (minimum viable)

### The evaluator (pure functions, in src/utils/simulator.ts)
- `evaluateIteration(iteration, personRecord) → SimulationResult`
- The SimulationResult has:
  - `cohortMembershipEvaluated: { label, matched }[]` — the cohort
    scope from the input record (we don't query DDB, but we surface
    which cohorts the person is in and which rules were scoped to
    each).
  - `ruleTraces: RuleTrace[]` — one per rule, in priority order:
    - `ruleIndex`, `ruleName`, `ruleType`
    - `evaluated: 'matched' | 'not-matched' | 'short-circuited' | 'skipped-no-cohort'`
    - `reason: string` — human-readable why (e.g. "CARE_HOME_FLAG = Y,
      rule's operator is `=`, comparator is 'Y' → match")
    - `commsRouting?: string` — for R/X/Y rules that matched
  - `finalStatus: 'actionable' | 'not_actionable' | 'not_eligible'`
  - `finalRouting?: { type: 'R' | 'X' | 'Y', code: string, source: 'rule' | 'iter-default' | 'campaign-default' }`
  - `actionableDescription?: string` — from the ActionsMapper lookup
    of the final routing code

### The UI (a drawer, like everything else)
- Left pane: a JSON editor for the person record
- Preset buttons at the top: "Elderly care home resident", "Adult
  with recent vaccination", "Young person, no history", "Edge
  case: missing data"
- Right pane: the trace, with each rule as a card showing pass/fail
  + reason. The final status + routing at the top of the trace.

### Scope decisions (and why)
- **No DDB query.** The user pastes the record. v2 could integrate
  with a mock or live query.
- **Cohort membership is taken from the input, not derived.** v1
  doesn't know how each cohort's source data is built (we'd need
  the cohort source queries). The user declares
  "cohortMembership": [...] in the input.
- **All operators implemented.** We already have the explainer for
  them; the evaluator is the inverse.
- **No "what if?" replay.** Save for v2.
- **No "compare two person records side by side".** Save for v2.
- **No persistent test suite.** Save for v2 (the user can save
  their person records to localStorage as JSON downloads).

## Where it lives in the UI

- "Simulate" button on the iteration card (alongside "Edit iteration
  settings")
- Also: a "Simulate against this rule" button inside the RuleEditor
  drawer (smaller scope: just evaluate this single rule)
- For v1: just the iteration-level entry point.

## What we're NOT building in v1

- DDB / mock data integration
- "What if" comparisons
- Test suites (saved person records)
- Backtest against historical data
- Conversational "why didn't X fire?" — though the trace is
  structured to make this a future addition
- Operator evaluator for `in` / `between` etc. — wait, we ARE
  implementing all of them. But `between` and `not_between` use
  comma-separated two-bound comparators, and `in` uses comma-
  separated lists. All do-able.

## Open question for the user

The DDB lineage details the user shared are interesting but the
simulator's evaluator doesn't actually need them — we just need
the *schema* of the person record. So the question is: should v1
have a "Load from DDB (mock)" button that pre-fills the JSON
editor with a sample record, using the schema the user described?

Pros:
- Educational: shows the user what the API actually receives
- Saves typing for common cases

Cons:
- We don't have a real DDB, so the mock has to be hand-crafted
- Adds a dependency on the mock staying in sync with the real schema

My recommendation: do a small sample-records dropdown (4-5 curated
personas, typed against the schema) without trying to mock the DDB.
The lineage details are useful for the user to know, but the
simulator doesn't need to reproduce them.

## Effort

- Pure evaluator function: ~3-4h (operator coverage is the bulk)
- UI: ~3-4h (drawer + JSON editor + presets + trace rendering)
- Wire-up + presets: ~1h
- Total: ~8-10h, one PR.

Or split:
- PR-10a: evaluator + trace-only view (no JSON editor yet) — ~4h
- PR-10b: JSON editor + presets + click-into-rule — ~4h

The split lets the user see results sooner and steer v2 direction.
