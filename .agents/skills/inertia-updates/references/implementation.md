# Relevance and implementation

## Review surface

Use this matrix to connect upstream changes to package behavior. These are
review questions, not a frozen list of supported options; derive the actual API
from the current README/runtime and the selected upstream release.

| Upstream surface | Questions for this adapter |
| --- | --- |
| Links, manual visits, request options | Are new options or callbacks useful through a `to` descriptor? Do method precedence, default preservation, cancellation, progress, loading, or error semantics change? |
| URL and routing helpers, Wayfinder | Is there a public replacement for local URL/method/component shaping? Do string, URL, descriptor, and Wayfinder inputs still normalize consistently? Check GET query merging and array serialization. |
| Prefetching and caching | Have modes, duration defaults, tags, invalidation, callbacks, deduplication, or scheduling changed? Does a new API remove the need for local compatibility logic? |
| Instant visits, optimistic updates, view transitions | Can the published router API carry the behavior through this adapter? Does it need an option, a callback, new types, or only documentation? |
| Partial reloads, reset/merge/once props, scroll and state | Does behavior require forwarding visit options, or does Inertia already handle it? Trace links to router behavior before adding anything. |
| Page URL, events, history, redirects | Do active/exact state, preserved URL, hash/query handling, or in-flight counters need adjustment? |
| Client setup, global defaults, SSR, public exports | Does upstream alter a used default, introduce a better public integration API, remove an export, or change browser-only behavior? |
| Vue and Vuetify integration | Can Vuetify actually consume the proposed return value or event hook? Check the supported Vuetify versions' `useLink` implementation when the integration contract matters. |
| Upgrade guides and release notes | Are there breaking changes, deprecations, fixes to behavior duplicated here, or raised Vue/Node/peer requirements? |

Server-only features, other frontend adapters, form components, devtools, and
standalone application facilities normally need no package change. Trace their
effect if they also change a router API, visit option, page state, or shared core
helper that this package uses. A dependency-only update or an `already-supported`
decision is a valid result; feature adoption does not require adapter code.

## Choose the smallest working integration

1. Verify the official Vue Link and router implementation in the released
   version. Prefer a public core/Vue helper to local logic; verify the export in
   the published package as well as source. Avoid copying upstream internals.
2. Demonstrate the consumer trigger with a concise `to` example and identify
   where it flows through normalization, base/visit/prefetch options, URL state,
   callbacks, or the returned Vuetify link contract.
3. Check availability across declared dependency floors. A lockfile upgrade
   alone does not make a new import safe for consumers on older allowed versions.
   Keep core and Vue adapter constraints coherent, including their transitive
   core relationship. Test an affected floor in a temporary fixture. If a new
   API requires a higher patch/minor floor within the supported Inertia major,
   make the smallest justified range change, verify the peers, and document its
   consumer effect. Prefer an existing public compatible path where one exists.
   Removing a supported major or changing an existing public contract requires
   direction unless the user has already authorized that migration.
4. Add only the adaptation this seam can deliver. Vuetify renders its own DOM;
   returning arbitrary event handlers does not make components bind them.
   In particular, re-evaluate hover or mousedown prefetch claims against real
   Vuetify consumption. Unsupported DOM behavior remains a documented limitation
   with a revisit condition tied to an upstream contract change.
5. Preserve the root invariants for non-GET browser hrefs, click-prefetch
   scheduling, and fresh mutable options/headers. A replacement is justified
   only by a verified public upstream path and behavioral evidence. Follow root
   guardrails for dependency ownership and release metadata.

Keep callbacks composable with internal loading/accounting behavior. Test the
return value of cancellation callbacks, defaults, explicit overrides, and option
mutation when the change affects them. Avoid forwarding every descriptor key
blindly: the browser href, adapter flags, and visit/prefetch options have
different consumers.

## Validation and documentation

For runtime or dependency changes, use the repository's configured checks. If
dependencies are missing, install the lockfile using `npm ci`. Add behavioral
coverage in the existing Vue-setup harness for affected behavior, and run
`npm test` (or the configured equivalent once scripts change). Do not invent a
lint/build/type-check command the project does not define.

The existing tests mock the Vue router but use real core helpers. They can prove
forwarded options and lifecycle behavior, not that a mocked option has the
promised effect in the real router or rendered Vuetify component. Check published
exports/types for new APIs; use a focused real-dependency consumer fixture when
event forwarding, router scheduling, dependency identity, or rendering is in
doubt. Test the affected minimum and selected current version, plus each
advertised Vuetify major when its integration is changed. Keep compatibility
experiments isolated from the main lockfile and report exactly what ran.

Update README descriptor lists, examples, limitations, and compatibility only
where verified behavior changes. Update `index.d.ts` if the public plugin/API
types change; use upstream types where appropriate instead of maintaining a
second full visit-options type. A docs-only correction does not require new
runtime tests.

For package/runtime/dependency changes, run `npm pack --dry-run --json`. Check
that the expected entrypoint and declarations remain present and that skill,
checkpoint, report, MCP, temporary fixture, or credential files are excluded.
Inspect the final diff and dependency tree for unintended churn. Keep required
test failures, unavailable compatibility checks, or mismatched peer claims
visible in the report and leave the run partial until resolved.

On a no-change run, confirm current local evidence, classify the reviewed delta,
and record why no runtime checks were needed. Do not create implementation work
merely to make the run appear productive.
