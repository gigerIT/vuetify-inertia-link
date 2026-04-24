# Project Overview

`vuetify-inertia-link`: small Vue 3 ESM plugin. Lets Vuetify components use
Inertia navigation via Vuetify `to` prop without Vue Router. Registers
`RouterLink` compatibility component: maps Vuetify link behavior to
Inertia v3 navigation, prefetching, and current page URL state.

## Repository Structure

- `.github/`: release-please workflow; publishes package releases.
- `index.js`: package entrypoint; full Vue plugin.
- `tests/`: Vitest/jsdom coverage for the `RouterLink.useLink()` integration.
- `README.md`: install, setup, usage, compatibility, notes.
- `CHANGELOG.md`: release-please managed release history.
- `package.json`: metadata, scripts, peer dependencies, ESM mode.
- `package-lock.json`: reproducible npm dependency graph.
- `release-please-config.json`: Node release automation config.
- `.release-please-manifest.json`: current release-please package version.

## Build & Development Commands

Install dependencies from lockfile:

```sh
npm ci
```

Install published package in consuming project:

```sh
npm install vuetify-inertia-link
```

Install peer dependencies in consuming project when needed:

```sh
npm install vue @inertiajs/vue3 vuetify
```

Run configured test script:

```sh
npm test
```

Preview package contents before publish:

```sh
npm pack --dry-run --json
```

Release workflow install step:

```sh
npm ci
```

Release workflow publish step:

```sh
npm publish --provenance --access public
```

> TODO: No build script in `package.json`.
> TODO: No lint script in `package.json`.
> TODO: No type-check script in `package.json`.
> TODO: No local run/dev server script in `package.json`.
> TODO: No debug command documented/configured.
> TODO: No manual deploy command beyond CI publish documented.

## Code Style & Conventions

- Native ESM JavaScript; `package.json` sets `"type": "module"`.
- Public entrypoint: `index.js`, default export.
- Plugin object: `VuetifyInertiaLink`; exposes `install(app)`.
- JavaScript: single quotes, semicolons, 4-space indentation.
- README examples: concise Vue/Inertia setup snippets, single-quoted imports.
- Releases: release-please, Node release type, `v` tags.
- Commit messages: release-please compatible conventional commits.
- Preserve peer dependency ranges unless intentionally changing compatibility.
> TODO: No formatter, linter, editorconfig, or commit template.

## Architecture Notes

```mermaid
flowchart LR
    App[Vue/Inertia app] --> Plugin[VuetifyInertiaLink plugin]
    Plugin --> RouterLink[RouterLink compatibility component]
    Vuetify[Vuetify components with to prop] --> RouterLink
    RouterLink --> Page[usePage().url]
    RouterLink --> Visit[router.visit and router.prefetch]
    Page --> Active[isActive and isExactActive]
    Visit --> Inertia[Inertia navigation]
```

One runtime module by design. Plugin install registers `RouterLink` for Vuetify.
Vuetify does not render this component; it calls `RouterLink.useLink()` and renders
its own element, so wrapping Inertia's official `<Link>` component is not feasible
for Vuetify `to` prop integration.

`useLink(props)` normalizes string, URL, Wayfinder, and descriptor `to` values;
delegates URL/method/query/intercept details to public `@inertiajs/core` helpers;
derives active state from `usePage().url`; and calls `router.visit()` or
`router.prefetch()` from `@inertiajs/vue3`.

- For non-GET descriptors, expose safe browser `href="#"` to keep Vuetify-rendered
  anchors focusable while using the real mutation URL only for internal Inertia visits.
- For click prefetch, call `router.prefetch()` and defer `router.visit()` by a
  microtask so Inertia can register the prefetch before the visit.
- Clone visit options and headers before every router call because Inertia mutates
  prefetch headers by adding `Purpose: prefetch`.

Core rule: keep plugin slim. Prefer importing/delegating to existing Inertia
behavior when Inertia already provides logic; do not reimplement it here.

## Testing Strategy

- `npm test` runs Vitest with jsdom via `vitest run --environment jsdom`.
- `tests/index.test.js` mounts a tiny Vue app wrapper so `RouterLink.useLink()` runs
  inside component setup and lifecycle hooks.
- Tests cover registration, active/exact state, GET query merging, modified clicks,
  non-GET safe href behavior, Wayfinder and instant visits, mutable prefetch headers,
  and click-prefetch visit deferral.
- CI runs release automation only after pushes to `master`.
- Release CI installs deps and publishes only when release-please creates release.
> TODO: Add a consumer fixture or e2e tests if Vuetify changes its `RouterLink`
> integration contract.

## Security & Compliance

- License: MIT in `package.json`.
- Runtime integrations are peer dependencies: `vue`, `@inertiajs/vue3`, `vuetify`.
- `@inertiajs/core` is a direct runtime dependency because the plugin imports public
  Inertia v3 helper functions; keep it aligned with `@inertiajs/vue3`.
- Do not commit secrets, npm tokens, local IDE files; `.gitignore` excludes
  `.idea`, `node_modules`, `bun.lockb`.
- GitHub release workflow grants `contents`, `issues`, `pull-requests`,
  `id-token` write permissions for release-please + npm provenance publishing.
- Publishing sensitive: verify contents before release with `npm pack --dry-run --json`.
> TODO: No dependency scanning, security policy, or vulnerability reporting policy.

## Agent Guardrails

- Do not modify `node_modules/` or generated package tarballs.
- Do not run `npm publish` manually unless user explicitly requests it.
- Do not change release metadata, tags, or changelog entries unless task is releases.
- If version metadata is changed manually, keep `.release-please-manifest.json` in sync
  with `package.json`; otherwise leave version bumps to release-please.
- Do not broaden peer dependency ranges without checking Vuetify, Vue, Inertia
  compatibility.
- Do not replace Inertia navigation with Vue Router; package exists to avoid that.
- Keep implementation small/package-friendly; avoid build tooling unless task needs it.
- Keep plugin slim: import/delegate to public `@inertiajs/core` and `@inertiajs/vue3`
  logic wherever available instead of reinventing it here.
- Do not make Vuetify `to` support depend on rendering Inertia's official `<Link>`;
  Vuetify only consumes the registered `RouterLink.useLink()` return value.
- Preserve safe-href, microtask click-prefetch, and option/header-cloning behavior
  unless Vuetify or Inertia exposes a cleaner public integration path.
- If blocked by bug/gap in dependency owned by `gigerit` or `@gigerit`, stop and
  report package, version, blocker, expected/actual behavior, repro path, suggested
  upstream fix. Do not patch around it here.
- Prefer root `AGENTS.md` for repo-wide facts; use scoped docs only if larger module
  is added later.

## Extensibility Hooks

- Consumers install default plugin with `app.use(VuetifyInertiaLink)`.
- Plugin extension point: Vue plugin `install(app)` API.
- Vuetify integration depends on registered `RouterLink` component name.
- Navigation flows through `router.visit()` and `router.prefetch()` from `@inertiajs/vue3`.
- Link parsing and visit option shaping should use public helpers from `@inertiajs/core`.
- Active state derives from `usePage().url` and normalized target href.
> TODO: No environment variables, feature flags, or runtime configuration options.

## Further Reading

- `README.md`: installation, setup, usage examples, compatibility.
- `CHANGELOG.md`: release history.
- `.github/workflows/release.yml`: release + npm publish automation.
- `release-please-config.json`: release-please behavior.
- `package.json`: metadata, scripts, peer dependency ranges.
