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

## Direction change (June 2026)

The user's instinct: instead of pasting JSON + reimplementing the
evaluator in JS, **call the real integration API**.

Why this is better:
- The API does the real evaluation — no chance of our JS evaluator
  silently diverging from production
- We display the result + any audit trace the API already produces
- No need to implement 30 operators in JS
- More authoritative — the user sees what the API would actually
  return, not what a JS reimplementation thinks it would return
- We don't have to keep up with schema changes; the API is the
  source of truth

## Open questions before v1 can be scoped

These need answers from the user before I can start building:

1. **What endpoint do we hit?** Is there a documented
   `/simulate` or `/evaluate` endpoint, or is it the same
   `/evaluate` the real call would use? Does it accept a
   sample NHS number + an iteration config?
2. **What does the response shape look like?** Specifically:
   - Does the response include a per-rule trace (which rules
     fired, in what order, with what inputs)? Or just the
     final decision?
   - Does the response include the cohort-membership decision
     (which cohorts the person matched), or is that implicit?
   - Does the response include the ActionsMapper resolution
     (what the final routing code actually does), or do we
     look that up ourselves?
3. **Does the API have a "no real evaluation, just trace the
   rules" mode for development?** Or do we always run the
   full evaluation?
4. **How do we handle the case where the API is unreachable?**
   Options: (a) hard fail with a clear error, (b) fall back
   to a local JS evaluator, (c) fall back to a cached result.
   The user probably wants (a) for now — the simulator is a
   development tool, not a production dependency.
5. **Auth?** Most likely the integration env is open or
   requires a static token. Need to know which.
6. **CORS?** Will the browser be allowed to call the
   integration env directly, or do we need a proxy?

## Two viable v1 shapes

### Shape A: thin wrapper over the API
- Drawer with: NHS number input + iteration picker (the
  current iteration is pre-filled) + a few "what does the
  API receive" preset buttons
- "Run simulation" button → POST to the API → display the
  response verbatim + format any trace into a human-readable
  view
- Effort: ~4-5h. The hard part is parsing the response shape,
  which we won't know until (1-2) above are answered.

### Shape B: hybrid — API when reachable, local evaluator as
fallback for offline authoring
- Same as Shape A, but with a JS evaluator as a fallback when
  the API is down
- Effort: ~10-12h (the JS evaluator is most of the work)

My recommendation: **Shape A first**. The JS fallback is
genuine extra work and we have no current evidence the API
will be down often enough to justify it.

## What's needed from the user

Before I start, ideally:
- (1) and (2) above — the endpoint + response shape
- A sample API request + response (so I can see the real shape
  rather than guessing)
- Confirmation on (4) — what's the desired offline behaviour

Without (1) and (2) I'd be guessing at the response shape, which
usually means a rewrite when reality hits.

## If we want to do *something* now

While the API design is being thought through, the smaller items
(PR-7 markdown preview, PR-8 virtual cohort naming, PR-9 GUID
validation) are good candidates — they're all < 2h, high-value,
and unblock authoring rather than requiring external system
knowledge.

## Effort

- Pure evaluator function: ~3-4h (operator coverage is the bulk)
- UI: ~3-4h (drawer + JSON editor + presets + trace rendering)
- Wire-up + presets: ~1h
- Total: ~8-10h, one PR.

Or split:
- PR-10a: evaluator + trace-only view (no JSON editor yet) — ~4h
- PR-10b: JSON editor + presets + click-into-rule — ~4h

The split lets the user see results sooner and steer v2 direction.
