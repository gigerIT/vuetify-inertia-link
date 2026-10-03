# Durable run state

State lives at `.agents/inertia-updates/state.json`; reports live beside it in
`runs/`. These files are version-controlled maintainer data and excluded from
the npm package by its existing file allowlist. The shipped initial state has
null run/checkpoint fields: creating the skill has not reviewed the backlog.

## Run lifecycle

1. Run `node .agents/skills/inertia-updates/scripts/record-run.mjs --status`.
   Retain its `hash` as `base_state_sha256`. Read the state and outstanding
   findings. Use a unique UTC ID such as `20261003T143000Z`; add a short suffix
   if another run already uses that report name.
2. Create `runs/<id>.md` before implementation. Save findings and progress there
   as work proceeds. An unrecorded report is interrupted work: inspect it on the
   next invocation. Never overwrite another run's report.
3. Finish the report, then write a proposal JSON in a temporary file. Run:

   ```sh
   node .agents/skills/inertia-updates/scripts/record-run.mjs /absolute/path/to/proposal.json
   ```

4. Inspect the returned status and resulting diff. The helper verifies the
   proposal, merges findings by stable ID, and replaces state atomically. It
   checks the starting hash under an exclusive lock so a stale run cannot erase
   newer findings. On a conflict, reread state, reconcile the reports/findings,
   and then regenerate the proposal; changing only the hash defeats the check.

A crashed writer may leave `state.json.lock` or a `state.json.tmp-*` file. Confirm
no writer is active before removing its stale artifacts. Recover invalid JSON
or unsupported schema versions explicitly from Git/reports, preserving findings.
The helper does not perform network research, infer feature support, run tests,
or verify the truth of a report; the agent supplies those judgments and evidence.

## Proposal shape

```json
{
    "schema_version": 1,
    "base_state_sha256": "<hash returned by --status>",
    "run": {
        "id": "20261003T143000Z",
        "started_at": "2026-10-03T14:30:00Z",
        "finished_at": "2026-10-03T14:45:00Z",
        "mode": "plan-only",
        "status": "planned",
        "scan_complete": true,
        "summary": "<what was reviewed and the outcome>",
        "report": "runs/20261003T143000Z.md",
        "verification": {
            "status": "not-needed",
            "summary": "<checks performed, or why execution checks were unnecessary>"
        }
    },
    "findings": []
}
```

`mode` is `implement` or `plan-only`. `status` is `complete`, `planned`,
`partial`, or `blocked`. A plan with missing evidence is `partial`, not
`planned`. `verification.status` is `passed`, `failed`, or `not-needed`; the
report lists exact commands, outcomes, and any limitations. Use `not-needed`
only when no required execution check applies, not when a command could not run.

Only `complete` advances `last_successful_run` and `checkpoint`. It requires
implementation mode, complete source coverage, adequate verification, no pending
or blocked findings, and explicit reconsideration of every old outstanding
finding. A deferred item may remain after its prerequisite is rechecked and
recorded. Other outcomes update `last_run` and merge findings while preserving
the old successful checkpoint; omit `checkpoint` entirely in those proposals.

`findings` contains only entries reviewed in this run; unmentioned entries are
retained. Keep unsourced research questions and coverage gaps in the report
until upstream evidence establishes a candidate; an unread URL is not feature
evidence. An empty findings array in a partial run does not mean no updates
exist. Each entry has:

| Field | Value |
| --- | --- |
| `id` | Stable kebab-case feature/behavior ID, e.g. `hover-prefetch`. |
| `status` | `pending`, `implemented`, `already-supported`, `not-applicable`, `deferred`, or `blocked`. |
| `summary`, `reason` | Behavior and evidence-based disposition. |
| `sources` | Nonempty array of official HTTPS evidence links, preferably pinned. |
| `local_evidence` | Array of current paths/symbols/test names; nonempty for implemented or already-supported findings. |
| `next_action` | Required for pending, deferred, and blocked work. |
| `revisit_when` | Required for deferred/blocked work: a concrete release, API, compatibility decision, or other prerequisite. |

The helper sets `first_seen_run` and `last_reviewed_run`. Keep a finding's ID when
new evidence changes its status. If a previous implementation was reverted or
is absent on this branch, reopen it and verify it again rather than trusting
the ledger. A newer release does not automatically satisfy a prerequisite.

## Successful checkpoint

A `complete` proposal also supplies `checkpoint` with these fields:

| Field | Contents |
| --- | --- |
| `captured_at` | UTC time the upstream review boundary was captured. |
| `docs` | `repository: "inertiajs/docs"`, discovered `ref`, and full 40-character commit `revision`. |
| `inertia` | `repository: "inertiajs/inertia"` and `releases`, an object keyed by every reviewed stable tag. Each value has full commit `revision` and `notes_sha256` (see source reference). |
| `packages` | Entries for `@inertiajs/core`, `@inertiajs/vue3`, `vue`, and `vuetify`. Each has `ranges` keyed by applicable manifest sections (`dependencies`, `peerDependencies`, `devDependencies`) and `locked`. Inertia entries also require `reviewed`, the exact published version inspected. |
| `local` | `head` at completion and `files_sha256` keyed by repo-relative paths for runtime, declarations, README, manifest, lockfile, and all test files. Hash final file bytes; exclude bookkeeping to avoid self-referential hashes. |

Capture file hashes after implementation and verification. Record existing dirty
changes in the report; HEAD alone is not sufficient to describe an uncommitted
implementation. `sha256sum` and `git rev-parse HEAD` provide the local values.

Preserve the release inventory for the reviewed supported interval across
incremental runs. If the interval changes, document why and rescan affected
coverage. Do not replace it with just the latest tag. Null or missing upstream
cursors remain unreviewed; every required source needs a complete baseline.

## Report contents and resumption

Keep the report useful to a reviewer who was not present:

- Run ID/mode, start/end times, branch/HEAD, and existing changes.
- Previous and captured docs/runtime boundaries, package ranges/versions, source
  links, discovery method, and any coverage gaps or source fallbacks.
- Finding decisions, minimum versions, package impact, implementation plan,
  completed edits, and unresolved prerequisites.
- Commands and outcomes, compatibility experiments, package-content check, and
  whether the successful checkpoint advanced.

Before declaring no changes, inspect incomplete reports and reconsider all
pending/deferred/blocked items. Plan-only and interrupted runs are intentionally
rescanned from the last successful boundary. Reuse their evidence only after
checking it against the current checkout and captured upstream revisions.

To test the writer without modifying real history, use `--state` pointing to a
temporary copy and put fixture reports in its sibling `runs/` directory. The
regression checks run with:

```sh
node --test .agents/skills/inertia-updates/scripts/record-run-checks.mjs
```
