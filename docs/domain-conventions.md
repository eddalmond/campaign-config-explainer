# Domain Conventions — analysis of the campaign config guidance

This doc maps every concrete rule and caveat from the business-user
campaign config guide against the current state of the tool. It is
the source of truth for what we should add.

Legend for the "Status" column:

- ✅ — already enforced
- ⚠️ — partially enforced (something is checked but not the full rule)
- ❌ — not enforced, should be
- 📝 — documented, not a code issue

## A. Common-mistakes list (priority: this is the user's pain)

| # | Rule | Status | What we should do |
|---|---|---|---|
| A1 | "Signposting criteria (ICBs, Local Authorities) must appear in both BOOK_NBS and BOOK_LOCAL R rules." | ❌ | This is a **cross-rule structural check** — for any R rule routing to e.g. BOOK_NBS that uses ICB/LA in its condition, there should be a corresponding R rule routing to BOOK_LOCAL with the same criteria. Out of scope for a single-config validator unless we add an iteration-level rule pair check. Flag as a *contextual warning* in the rule editor with a link to the docs. |
| A2 | "Use different priorities for different type rules." (don't have an F at priority 100 AND an S at priority 100) | ❌ | New validation: `CROSS_TYPE_PRIORITY_COLLISION` — when an iteration has rules of different types sharing the same priority, warn. Severity: warning. (We have *duplicate* rule detection but not *priority collision*.) |
| A3 | "Rules sharing the same type and priority are AND — every rule at that priority must pass for the rule to take effect." | ✅ partially | We have duplicate-rule detection. We should also flag: same Type+Priority but different Name/Attribute/Comparator, which is the actual "group" pattern. The current key includes Comparator, which means it only flags *literal* duplicates. We need a group-shape warning. |
| A4 | "Rules at the same priority must include the same CohortLabel setting." | ❌ | New validation: `PRIORITY_GROUP_COHORT_MISMATCH` — when a priority group has rules with different CohortLabel values, error. |
| A5 | "Rules that should be grouped together must share the same Name. Different names = different groups." | 📝 | This is the rule for *user intent* — name is the grouping key, so the Name field needs to be respected in the rule-sentence and in any grouping UI. Already used in our Mermaid diagrams. |
| A6 | "Put a space between attribute keys and values" (JSON formatting) | ❌ | JSON is auto-formatted by the editor; this is a non-issue. We can skip. |
| A7 | "No spaces between items in comparator comma-separated lists" | ❌ | New validation: `COMPARATOR_LIST_WHITESPACE` — for `in` / `not_in` / `MemberOf` / `NotMemberOf` / `between`, check the comparator has no spaces around commas. Severity: error (these will silently fail to match). |
| A8 | "GUID needed for both Campaign and each Iteration." | ⚠️ | We have ID fields in the types but no validation. New validation: `INVALID_GUID` — check IDs match the UUID pattern. Severity: warning (the API may accept non-UUIDs in some flows). |
| A9 | "Campaign ID should be persisted across versions of a particular campaign." | 📝 | Non-issue for the tool. Maybe a docs link. |
| A10 | "Remember to add the Campaign ID into the API Consumers to Campaign Mappings" | 📝 | Out of scope — this is a separate system. |
| A11 | "Campaigns have to be mapped to API consumers (at a product level)" | 📝 | Same as A10. |

### How-rules-combine

| # | Rule | Status | What we should do |
|---|---|---|---|
| A12 | "Same priority = AND. Every rule at that priority must be satisfied. Different priority = OR." | ✅ | This is exactly the existing logic, but we don't surface it in the rule editor. The rule-sentence we just added should mention when a rule is in a same-name priority group. |
| A13 | "The example uses two R rules with the same Name, same Priority, different operators." | 📝 | Confirm: when Name and Priority match, the rule-sentence should say "(part of an AND group: Name + Name)". |

### Recommended priority ranges

| # | Rule | Status | What we should do |
|---|---|---|---|
| A14 | Recommended ranges: 0-99 cohorts, 100-499 F, 500-999 S, 1000-1999 R, 2000-2999 X, 3000-3999 Y | ❌ | New validation: `PRIORITY_OUT_OF_RANGE` — warn when a rule's priority falls outside the recommended range for its type. Severity: info. |
| A15 | "Leaving gaps between priorities is a good idea" | 📝 | Could surface as a hint in the rule editor (e.g. "consider using 110 instead of 100 to leave room for insertion"). Skip for now. |

## B. Cohort rules

| # | Rule | Status | What we should do |
|---|---|---|---|
| B1 | "Iteration cohorts must not share the same priority number." | ❌ | New validation: `DUPLICATE_COHORT_PRIORITY` — two cohorts with the same Priority in the same iteration, error. |
| B2 | "CohortGroup collapses multiple cohorts into one API entry" | 📝 | Already in IterationDetail, but only as a raw field. Could surface in the cohort overview drawer / rule sentence: "these N cohorts share a CohortGroup and will be presented as one item". |
| B3 | "Even if a group only contains one cohort, you should still populate these attributes" | 📝 | Soft warning if CohortGroup is missing on a single-cohort iteration. Skip. |
| B4 | "If you set PositiveDescription or NegativeDescription to empty string, that text is omitted" | 📝 | We don't surface this. Could add to the rule-sentence / cohort editor. Skip. |
| B5 | "Virtual cohorts: Virtual='Y', named clearly (e.g. virtual_my_cohort_name)" | ⚠️ | We display virtual status, but no validation that a virtual cohort with a real-cohort-looking name exists. New validation: `VIRTUAL_COHORT_NAMING` — warn if `Virtual: 'Y'` but the CohortLabel doesn't include "virtual_". Severity: info. |
| B6 | "BEWARE: a 'real' cohort with the same name as a virtual one will be overridden by the virtual" | ❌ | New validation: `COHORT_VIRTUAL_NAME_CONFLICT` — when there's both a real and a virtual cohort with the same label, error. (This requires comparing across iterations? No — within an iteration. But the warning is more useful at the campaign level.) |
| B7 | "CohortLabel on F/S rules — comma-delimited, no spaces" | ❌ | See A7. Same validation covers it. |
| B8 | "Rules can be restricted to a single cohort or multiple cohorts" | ✅ | Already supported in RuleEditor. |

## C. Date conventions

| # | Rule | Status | What we should do |
|---|---|---|---|
| C1 | "Dates are YYYYMMDD, 8 chars" | ⚠️ | We display the formatted date but don't validate. New validation: `MALFORMED_DATE` — for date-type attributes, check the comparator (or the field value) is 8 digits. Severity: warning. |
| C2 | "Comparator for `>=` might be `20250101` or `in` might be `20250101,20260101`" | ✅ | Already supported. |
| C3 | "Format codes in `[[...:DATE(...)]]` use Python strftime" | 📝 | The current template detection doesn't parse the format. Could add a "validate format codes" check. Skip for now. |
| C4 | "If a referenced data item is empty, the variable resolves to empty string — check your descriptions handle this" | 📝 | Out of scope for the validator. Could add a "Description preview" that shows the rendered output with sample empty data, but big effort. |
| C5 | "A 500 Internal Server Error occurs if the token references a data item that doesn't exist or the format is invalid" | ❌ | New validation: `UNKNOWN_SUBSTITUTION_FIELD` — for `[[...:DATE(...)]]` and `[[...:ADD_DAYS(...)]]` tokens, check the field name against the catalog. Severity: warning. |
| C6 | "Functions: ADD_DAYS() — `[[TARGET.COVID.NEXT_DOSE_DUE:ADD_DAYS(91, LAST_SUCCESSFUL_DATE):DATE(%d %B %Y)]]`" | ❌ | Our template detection is a simple regex. We don't parse the function. New: `UNKNOWN_TEMPLATE_FUNCTION` — when the inner part isn't a recognised function (DATE, ADD_DAYS, NEXT_DOSE_DUE), warn. |
| C7 | "IterationDate must fall within the campaign start and end dates" | ❌ | New validation: `ITERATION_DATE_OUT_OF_RANGE` — when IterationDate < StartDate or > EndDate, error. |
| C8 | "IterationDate must be today or earlier" | 📝 | This is runtime behaviour, not a config invariant. Could surface in the iteration summary: "IterationDate is in the future — the system will use the most recent past iteration". |
| C9 | "Most recent past iteration is chosen" | 📝 | Could add to iteration picker: "currently active: <date>". Skip. |

## D. CommsRouting rules

| # | Rule | Status | What we should do |
|---|---|---|---|
| D1 | "Campaign-level DefaultCommsRouting is the fallback when no iteration-level default and no R rule triggers" | ✅ | Already understood. |
| D2 | "Iteration-level defaults: DefaultCommsRouting, DefaultNotEligibleRouting, DefaultNotActionableRouting" | ✅ | We have all three. |
| D3 | "Set to empty string if you don't want a fallback" | ✅ | We handle empty strings. |
| D4 | "R/X/Y rules are evaluated once (not per-cohort)" | 📝 | The Mermaid diagram already shows this. |
| D5 | "First matching priority group wins" | 📝 | Already shown in Mermaid. |
| D6 | "Fallback chain: rule → iteration default → campaign default" | ❌ | We have all three but never *visualise the chain*. New: small diagram / table on the iteration page showing "R: rule 1000 → rule 2000 → iteration default → campaign default". |
| D7 | "Pipe-delimited, no spaces: BOOK_NBS\|BOOK_LOCAL" | ⚠️ | We split on `|`. We don't validate no spaces. New validation: `COMMS_ROUTING_WHITESPACE` — for CommsRouting containing `|`, no spaces. Severity: error. |
| D8 | "R rules are evaluated once after eligibility status is determined" | 📝 | Already in Mermaid. |

## E. StatusText

| # | Rule | Status | What we should do |
|---|---|---|---|
| E1 | "Define NotEligible, NotActionable, Actionable" | ✅ | Supported. |
| E2 | "These appear in the API response. If omitted, defaults are used." | 📝 | We surface them. Could add a "preview" link. Skip. |

## F. RuleStop

| # | Rule | Status | What we should do |
|---|---|---|---|
| F1 | "RuleStop only works on S rules" | ✅ | Already validated. |
| F2 | "RuleStop stops processing of lower-priority S rules once a suitability rule triggers" | 📝 | Already in Mermaid. |
| F3 | "You'll frequently want RuleStop set to Y on all S rules" | ❌ | New validation: `S_RULE_WITHOUT_RULE_STOP` — warn when an S rule has RuleStop != "Y". Severity: info. |

## G. Description / Markdown / Variables

| # | Rule | Status | What we should do |
|---|---|---|---|
| G1 | "Description can be Markdown" | 📝 | We could add a Markdown preview. Currently no preview. Could be a "Preview" button in RuleEditor. |
| G2 | "Use `[[TARGET.RSV.LAST_SUCCESSFUL_DATE:DATE(%-d %B %Y)]]`" | ✅ | Token detection covers this. |
| G3 | "Variables come from Person or Target tables only" | ❌ | New validation: `COHORT_VARIABLE_IN_DESCRIPTION` — `[[COHORT....]]` references are not supported. Error. |
| G4 | "Empty variables resolve to empty string" | 📝 | Skip. |
| G5 | "ADD_DAYS chain: `[[TARGET.COVID.NEXT_DOSE_DUE:ADD_DAYS(91):DATE(%d %B %Y)]]`" | ⚠️ | Token detection works but doesn't parse the chain. See C6. |
| G6 | "NEXT_DOSE_DUE is a special case" | 📝 | Surface as a hint in the rule editor when LAST_SUCCESSFUL_DATE is used and ADD_DAYS appears. Skip. |

## H. Operators — the full list (vs our catalog)

The guide lists 32 operators. We have 16 in the catalog. Gap analysis:

| Guide | Our catalog | Notes |
|---|---|---|
| `=` | ✅ | |
| `>` | ✅ | |
| `<` | ✅ | |
| `!=` | ❌ | NEW |
| `>=` | ✅ | |
| `<=` | ✅ | |
| `contains` | ❌ | NEW |
| `not_contains` | ❌ | NEW |
| `starts_with` | ❌ | NEW |
| `not_starts_with` | ❌ | NEW |
| `ends_with` | ❌ | NEW |
| `not_ends_with` | ❌ | NEW (guide mentions it under not_starts_with context, but I don't see it in the list — verify) |
| `in` | ✅ | |
| `not_in` | ❌ | NEW |
| `MemberOf` | ✅ | |
| `NotMemberOf` | ❌ | NEW |
| `is_null` | ❌ | NEW |
| `is_not_null` | ❌ | NEW |
| `between` | ❌ | NEW |
| `not_between` | ❌ | NEW |
| `is_empty` | ❌ | NEW |
| `is_not_empty` | ❌ | NEW |
| `is_true` | ❌ | NEW |
| `is_false` | ❌ | NEW |
| `D<=` | ✅ | |
| `D<` | ✅ | |
| `D>=` | ✅ | |
| `D>` | ✅ | |
| `W<=` | ❌ | NEW |
| `W<` | ❌ | NEW |
| `W>=` | ❌ | NEW |
| `W>` | ❌ | NEW |
| `Y<=` | ✅ | |
| `Y<` | ✅ | |
| `Y>=` | ✅ | |
| `Y>` | ✅ | |

**That's 18 missing operators.** This is a big catalog gap.

Of those, the highest-value to add first:
- `!=`, `not_in`, `NotMemberOf` — fundamental (negation, missing)
- `is_null`, `is_not_null` — fundamental (the guide specifically calls out NULL semantics)
- `W*` operators — explicit in the guide, just not in our catalog
- `between` / `not_between` — different comparator syntax (two bounds, not one)
- `contains` / `starts_with` / `ends_with` — string operators, big new category

Lower priority:
- `is_true` / `is_false` / `is_empty` / `is_not_empty` — boolean / empty checks, rare in practice

## I. Things the docs mention that we don't surface at all

1. **The "fallback chain" diagram** (D6) — the most concrete visualisation gap. Would be a small "routing path" diagram per iteration showing: R-rule-priority-1000 → R-rule-priority-1100 → DefaultCommsRouting-iter → DefaultCommsRouting-campaign.
2. **Markdown preview** in the rule description field (G1).
3. **The currently-active iteration indicator** (C9).
4. **The "AND group" visual indicator on rules with the same name+priority** (A12/A13). The rule-sentence should call this out: "(AND group: MyRuleName — 2 rules at priority 1000)".

## J. Higher-level gaps in the tool

1. **No notion of "diff between two iterations"**. The user mentioned this is a manual pain point in the original conversation. The user can use Duplicate iteration to clone, but there's no side-by-side diff view. ~6-8h, would directly address the iteration-to-iteration authoring workflow.
2. **No notion of "where is this attribute used?"** — for any given attribute, the user can't see which rules reference it. ~2h.
3. **No notion of "where is this CommsRouting used?"** — for any given routing code, the user can't see which R/X/Y rules + which ActionsMapper entries reference it. ~2h.
4. **No version-history / "what changed in this iteration"** — the user has no way to know which rules they added vs which were in the loaded snapshot, except by looking at the JSON diff. ~1h if we add a "recently added/changed rules" highlight.

## Summary: what the next PRs should be

In rough priority order (most user pain first):

### PR-1: Catalog gap fill — missing operators (≈2-3h)
- Add the 18 missing operators to `src/data/catalog.ts`
- For each, the `appliesTo` list (which value types), description, comparatorHint
- For `between` / `not_between`, the comparator hint is "two values, comma-separated (e.g. 100, 200)"
- For `is_null` / `is_not_null` / `is_true` / `is_false` / `is_empty` / `is_not_empty`, no comparator
- Update `RuleEditor` to allow a free-text operator when the user wants to type one in (so an operator we don't know about doesn't block save)
- For `W*` operators, add the same comparator parsing as `D*` / `Y*` in `explain.ts`

### PR-2: High-priority validation rules (≈3-4h)
- A2: `CROSS_TYPE_PRIORITY_COLLISION`
- A4: `PRIORITY_GROUP_COHORT_MISMATCH`
- A7: `COMPARATOR_LIST_WHITESPACE`
- A14: `PRIORITY_OUT_OF_RANGE`
- B1: `DUPLICATE_COHORT_PRIORITY`
- C1: `MALFORMED_DATE`
- C5: `UNKNOWN_SUBSTITUTION_FIELD`
- C7: `ITERATION_DATE_OUT_OF_RANGE`
- D7: `COMMS_ROUTING_WHITESPACE`
- F3: `S_RULE_WITHOUT_RULE_STOP`
- G3: `COHORT_VARIABLE_IN_DESCRIPTION`

### PR-3: Fallback-chain diagram (≈2h)
- Small diagram in the iteration card showing R → X → Y fallback chains, per the guide.

### PR-4: "Where is this used?" cross-references (≈3-4h)
- Attribute → list of rules that reference it
- CommsRouting code → list of R/X/Y rules + ActionsMapper entry
- Cohort → list of rules scoped to it
- Render as a small panel at the bottom of each section, or as hover-over tooltips

### PR-5: Rule-sentence AND-group mention (≈30min)
- When a rule's (Type, Priority, Name) matches another rule, mention it in the sentence: "(part of AND group 'FutureNBSBooking' — 2 rules)"

### PR-6: Diff between iterations (≈6-8h)
- New "Compare iterations" mode that shows two iterations side by side, with rule-level diffs.
- This is the largest single item, addresses the user's stated iteration-to-iteration authoring workflow pain.

### PR-7: Markdown preview in rule description (≈2h)
- Side-by-side edit + preview for the Description field in RuleEditor.
- Use the existing TemplateChips to render the variable tokens, then a minimal Markdown renderer for the surrounding text.

### PR-8: Virtual cohort naming + conflict detection (≈1h)
- B5: `VIRTUAL_COHORT_NAMING`
- B6: `COHORT_VIRTUAL_NAME_CONFLICT`

### PR-9: Invalid GUID detection (≈30min)
- A8: `INVALID_GUID`

## What we explicitly do NOT do (out of scope)

- "Why is this rule firing?" simulator — needs a DDB mock. Roadmap only.
- Decision-table editor for bulk ops — would need significant UI investment.
- "Currently active iteration" indicator — depends on a "today" call we'd need to make; better to ship later.
- Refactoring the RuleEditor into a true schema-driven form — over-engineering for one role.
