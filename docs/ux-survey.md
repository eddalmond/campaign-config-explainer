# Configuration Visualisation & Editing — Landscape Survey

A comparison of approaches to visualising and editing structured / rule-based
configs, with specific takeaways for `campaign-config-explainer`.

## Why we did this

We've now shipped 8 features: dark mode, working copy + localStorage, full CRUD
on rules/cohorts/actions/iterations, operator explanations, validation panel,
template chips, duplicate/delete iteration, inline section edits, live JSON
preview with diff. That's a lot of bespoke code built incrementally.

Before piling on more, it was worth stepping back to see what others got right
(and wrong) at this kind of problem.

## The 4 categories that show up

The space isn't one thing. Different problems demand different patterns:

| Category | Examples | What it solves | What it doesn't |
|---|---|---|---|
| **Schema-driven form generators** | RJSF, JSON Forms, SurveyJS, Form.io | Render forms from a JSON Schema definition | Don't help with rule *visualisation* or evaluation flow |
| **Rule/decision engines** | Code Effects, FlowWright, drools, Easy Rules | Evaluate complex "if X then Y" logic with a visual builder | Often heavyweight enterprise platforms; opinions on UI vary wildly |
| **Visual rule builders** | Feathery, Zipato, openHAB, MS Mail rules, Apple iTunes | Lower the floor for non-technical users to author business logic | Tend to focus on simple if-this-then-that, not domain-specific ops |
| **Config visualisers / explainers** | (rare) — Terraform visualisers, K8s dashboards, dbt docs | Show what a config *means*, not just *what* it says | Usually read-only, not authoring tools |

`campaign-config-explainer` sits in an unusual middle: it's a *visualiser* for
a rule-based *config* that drives a *rule engine* (DDB-backed), with authoring
bolted on. None of the categories above is a perfect fit, but each one has
something to teach us.

## What each category taught us

### 1. Schema-driven form generators (RJSF, JSON Forms, SurveyJS, Form.io)

**Key insight: the `jsonSchema` + `uiSchema` split.** JSON Forms and RJSF
both separate the *data shape* (what fields exist, their types, validation
rules) from the *presentation* (which widget, layout, order). This is exactly
what we already do informally with our `catalog.ts` (the attribute/operator
catalog) — but we should consider formalising it. The benefit: the
schema-driven form could be re-skinned for a different role (manager vs
analyst) without changing the data model.

**Key insight: renderers vs platforms.** Form.io's positioning is sharp —
"are you rendering a form, or do you need forms as application infrastructure?"
We're firmly in the rendering camp: we have our own data, our own storage, our
own API. We don't need Form.io's full platform. But we should be careful not
to accidentally re-invent its weakest parts (over-customisable widget zoo,
governance controls we don't need).

**Caution from this category:** The form-builder zoo is huge and most of
them produce *generic forms*. The hard part of our problem isn't the form
fields, it's:
- the *meaning* of the fields (e.g. `Y>=` means "at least N years ago")
- the *relationships* between fields (CohortLabel ↔ CommsRouting ↔ ActionsMapper)
- the *flow* of evaluation (F rules then S rules then R rules)

A schema-driven form gives us the first; we'd still need to build the latter
two ourselves.

### 2. Rule/decision engines (Code Effects, FlowWright, drools)

**Key insight from Code Effects: read-the-rule-in-English.** Their entire
positioning rests on the idea that the rule itself should read as a sentence
in natural language — no jargon, no operator codes, no business-vs-IT
bifurcation. Their marketing is heavy on this, but the principle is sound:
**the rule should be self-documenting**.

We already do this in operator explanations (`Y>= -25` →
"date is at most 25 years ago") but we could go further. Code Effects goes as
far as letting the entire rule be displayed in (translatable) natural
language. We probably don't need translation, but we *do* have a chance to
surface the rule as a sentence at the top of the rule editor, so the user
sees what they're building before they pick from the operator dropdown.

**Key insight from FlowWright: decision tables for bulk ops.** For sets of
related rules (e.g. "all the F-rules at priority 100 across all cohorts"),
spreadsheet-style editing is much faster than one-by-one drawer editing.
This is a real gap for us: if someone wants to tweak 10 R-rules' comparator
values, they currently have to open the drawer 10 times.

**Caution from this category:** These tools are aimed at non-developers. We
*are* developers authoring API configs. The "no-code" affordances can become
friction (a developer can type `-25` faster than they can pick from 6
operators). The right balance is: schema-aware for the *non-obvious* fields
(dates, codes), free text for the *obvious* ones (numbers, email addresses).

### 3. Visual rule builders (Feathery, Zipato, Mail rules, iTunes)

**Key insight from Feathery: branch + condition + clause + action as the
universal rule shape.** Almost every rule builder converges on this
4-element decomposition: a rule has branches; each branch has a condition
(if X) and an action (then Y); you can add a clause (else) and chain
branches (also do Z). The repetition across products suggests this *is* the
right shape.

Our rules don't decompose quite the same way — they're flattened with
Type/Operator/Comparator fields. For our domain, that works. But for the
*iteration* level (which has its own meta-rules about what types of rules it
expects), the Feathery decomposition might be useful when we add things
like rule-level previews.

**Key insight from Apple Mail/iTunes rules: the rule sentence IS the UI.**
Both products put a single human-readable sentence at the top ("Show this
message when **any** of the following are true:") and the form is a *refinement*
of that sentence. The sentence updates live as you change dropdowns.

This is the strongest pattern in the entire landscape. We don't do this
yet. Our rule editor is a form, not a sentence. The user has to mentally
synthesise "so this means: if person's RSV LAST_SUCCESSFUL_DATE is at least
25 years ago..." The sentence could just be there, at the top of the drawer,
updating live as they type.

**Key insight from the visual builders: the "+" button is a divider, not a
button.** Almost all rule builders position the "Add rule" button *inline*
between rules or directly under the last rule — not in a toolbar. The
proximity matters: it's the difference between "I'm adding to this list" and
"I'm going somewhere else to do an action". We're inconsistent here: the
"+ Add Rule" is in the AuthorPanel footer (far from the rule list); the
cohorts table has an Edit button per row. We should normalise.

### 4. Config visualisers (Terraform, dbt, K8s dashboards)

**Key insight: explanation in context, not in a separate doc.** These tools
all do the same thing: hover-over, click-to-expand, "this means X". The
explanation lives next to the thing being explained, not in a separate
"help" panel. We do this in two places (operator explanation under the
comparator; template chips next to dates) but we could do it more — the
"what is CohortLabel" question probably has an answer the first time a user
sees it.

**Key insight: visualisation of the *flow*, not the *structure*.** dbt docs
shows a DAG of model dependencies. K8s dashboards show the rollout status of
pods. Both are visualisations of *behaviour*, not of the config that defines
it. Our Mermaid diagrams are the same idea (Phase 1 / Phase 2 flow). But
they're static. None of these visualisations is editable in place.

**Caution from this category:** These tools tend to be *read-only*. The
moment you try to make them editable, you hit the schema-driven form
problem again, and you end up with a form layered on top of a visualisation,
which is what we have. Maybe that's fine. Maybe there's a better pattern
in the visual-programming space (Scratch, Node-RED) — but those are for
imperative logic, not declarative configs.

## Synthesised recommendations for our tool

In rough order of value / effort:

### A. Read-the-rule-in-English (biggest UX win, small effort)

Put a live, plain-English summary at the top of the RuleEditor drawer:
> "If a person's `RSV.LAST_SUCCESSFUL_DATE` is at least 25 years ago
> (treating null as 1800-01-01), they're filtered out as not eligible."

Updates live as the user types. ~2 hours. Big payoff because it lets the
user *verify their intent* without mentally parsing the operator.

### B. Sentence-summary at the iteration level (~1 hour)

Same idea, but for the iteration: "This iteration filters out people whose
last RSV vaccination was more than 25 years ago, suppresses care home
residents, and routes everyone else to `INFO_TEXT`."

We have all the data. It's just not surfaced in one place.

### C. Decision-table editor for bulk operations (~6-8 hours)

When a user clicks "Manage rules" → "Eligibility rules" (or similar), show
a spreadsheet-style editor that lets them tweak comparators across many
rules at once. Filter by type, by priority, by cohort. Inline edit each
cell. This is the FlowWright pattern adapted to our domain.

Useful specifically for the iteration-to-iteration refactoring the user
already does manually.

### D. Persistent recent-attribute memory (~1 hour)

RJSF and JSON Forms both remember "what did this user last pick for an
attribute of this type" and surface it. We don't. For someone editing 20
rules all of which use `RSV.LAST_SUCCESSFUL_DATE`, the attribute dropdown
should put that attribute at the top, not alphabetical.

Small effort, high delight.

### E. A proper "Why is this rule firing?" simulator (~16-20 hours)

The biggest gap in the visualisation space. Our Mermaid diagrams show the
*flow* of evaluation, but not the *result* for a given person. A sandbox
where the user can paste a JSON of a person's attributes and see which
rules match, in what order, with what final routing — would be the
killer feature. Code Effects calls this "decision automation" and it's
their primary differentiator. We can't match their scale but we can do
a useful single-iteration version.

This is probably out of scope for the current iteration (we'd need a
mock of the DDB attributes), but worth keeping on the roadmap.

### F. Reduce drawer dependency (~4-6 hours)

We have a drawer. We have section-level edit buttons. We have
"Manage X" list drawers. But for the *highest-frequency* edits (changing
a comparator value, changing a CommsRouting code), a drawer is overkill.
An inline editable cell — like Airtable, Notion, or Feathery's rule
cards — would be much faster.

Specifically:
- The comparator value in the rule tables should be inline-editable
- The CommsRouting code in the action rules should be inline-editable
- Cohort priority and group should be inline-editable

This is the Apple Mail pattern: the table IS the editor for simple
changes; the drawer is for complex ones.

## What's not worth doing

- **Schema-driven form generation wholesale.** The benefit (re-skinning
  per role) doesn't apply to us — we have one role (config author) and
  one schema. RJSF would be over-engineering.
- **No-code / low-code framing.** Our users are developers. "Empower
  non-technical users" isn't a goal. Schema-aware defaults are; forcing
  everything through dropdowns isn't.
- **Drag-and-drop rule ordering.** We already use Priority as a sort
  key. Drag-and-drop would be a *nice-to-have* but Priority + the existing
  up/down affordance is enough.

## What to do next

Of the recommendations above, I'd do A and B together (one PR, ~3 hours),
then F (separate PR, ~5 hours). D is a nice 30-min add-on to either. C
and E are bigger and worth scheduling.
