# Project Overview

`vuetify-inertia-link`: small Vue 3 ESM plugin. Lets Vuetify components use
Inertia navigation via Vuetify `to` prop without Vue Router. Registers
`RouterLink` compatibility component: maps Vuetify link behavior to
`@inertiajs/vue3` `router.visit()` + current page URL state.

## Repository Structure

- `.github/`: release-please workflow; publishes package releases.
- `index.js`: package entrypoint; full Vue plugin.
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
- Existing JavaScript: double quotes, semicolons, 4-space indentation.
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
    RouterLink --> Visit[router.visit href]
    Page --> Active[isActive and isExactActive]
    Visit --> Inertia[Inertia navigation]
```

One runtime module by design. Plugin install registers `RouterLink` for Vuetify.
`useLink(props)` reads `props.to.value` target URL, exposes active state from
`usePage().url`, calls `router.visit(href)` on normal clicks. Shift/meta/ctrl
modified clicks keep browser behavior.

Core rule: keep plugin slim. Prefer importing/delegating to existing Inertia
behavior when Inertia already provides logic; do not reimplement it here.

## Testing Strategy

- `package.json` defines `npm test`, but it exits with error placeholder.
- No unit, integration, browser, or e2e test files.
- CI runs release automation only after pushes to `master`.
- Release CI installs deps and publishes only when release-please creates release.
> TODO: Add tests for active state, exact active state, modified clicks, visit calls.
> TODO: Decide Vitest, Vue Test Utils, or consumer fixture.

## Security & Compliance

- License: MIT in `package.json`.
- Runtime integrations are peer dependencies: `vue`, `@inertiajs/vue3`, `vuetify`.
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
- Do not broaden peer dependency ranges without checking Vuetify, Vue, Inertia
  compatibility.
- Do not replace Inertia navigation with Vue Router; package exists to avoid that.
- Keep implementation small/package-friendly; avoid build tooling unless task needs it.
- Keep plugin slim: import/delegate to Inertia logic wherever available instead of
  reinventing it here.
- If blocked by bug/gap in dependency owned by `gigerit` or `@gigerit`, stop and
  report package, version, blocker, expected/actual behavior, repro path, suggested
  upstream fix. Do not patch around it here.
- Prefer root `AGENTS.md` for repo-wide facts; use scoped docs only if larger module
  is added later.

## Extensibility Hooks

- Consumers install default plugin with `app.use(VuetifyInertiaLink)`.
- Plugin extension point: Vue plugin `install(app)` API.
- Vuetify integration depends on registered `RouterLink` component name.
- Navigation flows through `router.visit(href)` from `@inertiajs/vue3`.
- Active state derives from `usePage().url` and target `href`.
> TODO: No environment variables, feature flags, or runtime configuration options.

## Further Reading

- `README.md`: installation, setup, usage examples, compatibility.
- `CHANGELOG.md`: release history.
- `.github/workflows/release.yml`: release + npm publish automation.
- `release-please-config.json`: release-please behavior.
- `package.json`: metadata, scripts, peer dependency ranges.
