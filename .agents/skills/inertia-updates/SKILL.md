---
name: inertia-updates
description: Check official Inertia documentation and releases for changes relevant to vuetify-inertia-link, plan and implement compatible updates, and checkpoint the review for incremental runs. Use for upstream feature adoption or an Inertia compatibility refresh in this repository; ordinary bug fixes and dependency bumps do not require this workflow.
---

# Inertia updates

Keep this package aligned with released Inertia behavior through its existing
Vuetify `to` integration. A normal invocation researches, plans, implements,
verifies, and records the work in one run. Write the plan before editing, then
continue with compatible changes without a separate approval step.

Explicit user scope wins: `plan only` produces a researched plan and pending
findings; `full review` ignores the previous scan boundary but retains history.
Creating or editing this skill does not itself request an upstream update run.

## 1. Recover context

- Read root `AGENTS.md`, the runtime and declarations, package manifest and
  lockfile, README, and relevant tests. Identify the actual supported Inertia
  major, dependency floors, and Vuetify contract from this checkout.
- Read [state.md](references/state.md) and
  `.agents/inertia-updates/state.json`. Inspect the latest report and all
  `pending`, `deferred`, and `blocked` findings. Capture the state hash with:

  ```sh
  node .agents/skills/inertia-updates/scripts/record-run.mjs --status
  ```

- Record the branch, HEAD, existing changes, UTC start time, and installed versus
  locked dependency versions. Preserve unrelated work. Check the previous local
  file fingerprints: a recorded implementation must still exist in this
  checkout before it can count as done.
- A null checkpoint means a first full baseline, not “nothing new.” Recover a
  damaged checkpoint from Git or prior reports; never silently discard history.

This step is complete when the prior coverage boundary, outstanding work, and
current compatibility envelope are known.

## 2. Collect an upstream delta

Read [sources.md](references/sources.md). Use the configured `inertia_docs` MCP
for discovery and explanations, then pin evidence to official docs revisions
and released package source. Use its documented fallback when unavailable.

- Capture a fixed upper bound: docs commit and released versions/tags under
  review. Changes arriving during this run belong to the next run.
- First run: review the complete relevant documentation and stable release
  history from the package's minimum supported Inertia version to the selected
  current stable release. Existing gaps count even if they predate this skill.
- Later runs: compare the saved docs commit, release inventory and note hashes,
  package versions, and local file fingerprints. Review added, changed, renamed,
  or removed material and revisit the outstanding findings. Enumerate new docs
  pages as well as changes to familiar pages.
- Track docs changes independently of releases. Review amended release notes,
  new releases in older supported lines, and relevant public API deprecations.
  Read through pagination; a search result or first release page is not an
  exhaustive inventory.
- Documentation can precede a release. Confirm availability in the exact
  published `@inertiajs/core` and Vue adapter versions before proposing code.
  Record future-major and prerelease items for follow-up unless requested.

Record unavailable sources and incomplete ranges. An equivalent official source
can close a coverage gap; a failed fetch cannot count as “no updates.”

## 3. Decide relevance and write the plan

Use the relevance matrix in [implementation.md](references/implementation.md).
For each candidate, connect the upstream behavior to a concrete consumer use of
Vuetify's `to` prop or an existing adapter implementation. Also look for new
public helpers that can replace local logic.

Write `.agents/inertia-updates/runs/<run-id>.md` before implementation. Include
the source boundary, one row per finding, and the proposed edits and checks.
Each row needs a stable finding ID, upstream evidence, minimum released version,
current package behavior, decision, and reason. Classify candidates as:

- `pending`: relevant work to implement in this run or a plan-only run;
- `already-supported`: verified delegation or existing code needs no change;
- `not-applicable`: no effect on this package's contract;
- `deferred`: a concrete prerequisite or compatibility decision is outstanding;
- `blocked`: an attempted change cannot proceed, with a reproducible blocker.

Keep reasons for excluded changes so subsequent runs do not rediscover them.
Group clearly unrelated release entries in the report; the persistent ledger
needs individual records for relevant, disputed, or deferred features. Reuse
finding IDs when evidence changes rather than creating duplicates.

For every chosen change, name the public API, affected files, compatibility
decision, and observable behavior to verify. Compatibility-preserving bug fixes,
additive options, dependency updates within supported ranges, and useful
documentation corrections are normal implementation work. A major migration or
breaking public-contract change needs its own concrete plan and user direction
unless already authorized. Continue independent compatible work meanwhile.

## 4. Implement and verify

Follow [implementation.md](references/implementation.md) for affected surfaces.
Use upstream public behavior and root guardrails to keep the adapter small.
Finish the selected compatible changes, update consumer documentation and any
affected declarations, and check the resulting package. Change a finding to
`implemented` only after its behavior is verified in the current checkout.

Scale validation to the change. Runtime or dependency changes require the
configured tests, checks for affected dependency floors, and a package dry run.
Docs-only or no-change runs need evidence review and an explicit explanation of
which execution checks were unnecessary. Re-run a check only after changes or
failures warrant it. A mocked router test alone cannot prove a new upstream API
exists or that Vuetify forwards a DOM event.

In plan-only mode, leave runtime, dependency, and consumer-documentation files
untouched; keep implementation findings pending. Planning can write the report
and ledger. When coverage or validation is incomplete, preserve useful work and
record a partial/blocked outcome instead of claiming success. Apply the root
stop-and-report rule for a dependency blocker owned by `gigerit`/`@gigerit`.

## 5. Save the run

Follow [state.md](references/state.md) to finish the report and submit a run
proposal through `record-run.mjs`. Do not edit checkpoint fields by hand.

- A successful implementation run, including a verified no-change run, may
  advance the checkpoint only after complete source coverage and triage, passing
  required checks, and disposition of all pending findings.
- Deferred work retains a reason and a revisit condition even when the scan
  advances. Reconsider it on every invocation, including zero-delta runs.
- Plan-only, partial, blocked, and failed-validation runs update the last-run
  record and finding ledger without advancing the successful checkpoint.
- Keep reports and state with the code changes so another clone or branch can
  resume. Reconcile concurrent state changes instead of overwriting them.

Report the reviewed versions/revisions, implemented changes, material exclusions
or blockers, validation results, report path, and whether the checkpoint advanced.
Normal invocation ends with local reviewable changes; commits, pushes, PRs,
upstream messages, and publishing require their own authorization. Leave release
metadata to the project's release workflow.
