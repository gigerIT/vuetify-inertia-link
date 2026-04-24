# Project Overview

`vuetify-inertia-link` is a small Vue 3 ESM plugin that lets Vuetify components use
Inertia navigation through Vuetify's `to` prop without installing Vue Router. It
registers a `RouterLink` compatibility component that maps Vuetify link behavior to
`@inertiajs/vue3`'s `router.visit()` and current page URL state.

## Repository Structure

- `.github/` contains the release-please workflow that publishes package releases.
- `index.js` is the package entrypoint and contains the full Vue plugin.
- `README.md` documents installation, setup, usage, compatibility, and notes.
- `CHANGELOG.md` is maintained by release-please for published release history.
- `package.json` defines package metadata, scripts, peer dependencies, and ESM mode.
- `package-lock.json` locks the npm dependency graph for reproducible installs.
- `release-please-config.json` configures Node release automation for this package.
- `.release-please-manifest.json` tracks the current release-please package version.

## Build & Development Commands

Install dependencies from the lockfile:

```sh
npm ci
```

Install the published package in a consuming project:

```sh
npm install vuetify-inertia-link
```

Install peer dependencies in a consuming project when needed:

```sh
npm install vue @inertiajs/vue3 vuetify
```

Run the configured test script:

```sh
npm test
```

Preview the package contents before publish:

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

> TODO: No build script is configured in `package.json`.
> TODO: No lint script is configured in `package.json`.
> TODO: No type-check script is configured in `package.json`.
> TODO: No local run or dev server script is configured in `package.json`.
> TODO: No debug command is documented or configured.
> TODO: No manual deploy command beyond CI publish is documented.

## Code Style & Conventions

- Source is native ESM JavaScript because `package.json` sets `"type": "module"`.
- The public entrypoint is `index.js`, exported as the package default export.
- The plugin object is named `VuetifyInertiaLink` and exposes an `install(app)` hook.
- Existing JavaScript uses double quotes, semicolons, and 4-space indentation.
- README examples use concise Vue/Inertia setup snippets and single-quoted imports.
- Releases are managed by release-please with Node release type and `v` tags.
- Commit messages should be compatible with release-please conventional commits.
- Preserve the peer dependency ranges unless intentionally changing compatibility.
> TODO: No formatter, linter, editorconfig, or commit template is present.

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

The package intentionally has one runtime module. Installing the plugin registers a
`RouterLink` component for Vuetify to consume. `useLink(props)` reads `props.to.value`
as the target URL, exposes active state from `usePage().url`, and calls
`router.visit(href)` for normal clicks. Modified clicks using shift, meta, or ctrl are
left to browser behavior.

## Testing Strategy

- `package.json` defines `npm test`, but it currently exits with an error placeholder.
- No unit, integration, browser, or e2e test files are present in this repository.
- CI currently runs release automation only after pushes to `master`.
- Release CI installs dependencies and publishes only when release-please creates a
  release.
> TODO: Add tests for active state, exact active state, modified clicks, and visit calls.
> TODO: Decide whether tests should use Vitest, Vue Test Utils, or a consumer fixture.

## Security & Compliance

- The package is licensed as MIT in `package.json`.
- Runtime integrations are peer dependencies: `vue`, `@inertiajs/vue3`, and `vuetify`.
- Do not commit secrets, npm tokens, or local IDE files; `.gitignore` excludes `.idea`,
  `node_modules`, and `bun.lockb`.
- GitHub release workflow grants `contents`, `issues`, `pull-requests`, and `id-token`
  write permissions for release-please and npm provenance publishing.
- Treat package publishing as a sensitive operation; verify package contents before
  release with `npm pack --dry-run --json`.
> TODO: No dependency scanning, security policy, or vulnerability reporting policy is
> documented in the repository.

## Agent Guardrails

- Do not modify `node_modules/` or generated package tarballs.
- Do not run `npm publish` manually unless the user explicitly requests it.
- Do not change release metadata, tags, or changelog entries unless the task is about
  releases.
- Do not broaden peer dependency ranges without checking Vuetify, Vue, and Inertia
  compatibility.
- Do not replace Inertia navigation with Vue Router; the package exists to avoid that.
- Keep the implementation small and package-friendly; avoid adding build tooling unless
  the task requires it.
- If blocked by a bug or gap in a dependency owned by `gigerit` or `@gigerit`, stop and
  report the package, version, blocker, expected and actual behavior, repro path, and a
  suggested upstream fix instead of patching around it here.
- Prefer root `AGENTS.md` for repo-wide facts; use scoped docs only if a larger module is
  added later.

## Extensibility Hooks

- Consumers install the default plugin with `app.use(VuetifyInertiaLink)`.
- The plugin extension point is Vue's plugin `install(app)` API.
- Vuetify integration depends on the registered `RouterLink` component name.
- Navigation behavior flows through `router.visit(href)` from `@inertiajs/vue3`.
- Active state derives from `usePage().url` and the target `href`.
> TODO: No environment variables, feature flags, or runtime configuration options are
> defined in this package.

## Further Reading

- `README.md` for installation, setup, usage examples, and compatibility.
- `CHANGELOG.md` for release history.
- `.github/workflows/release.yml` for release and npm publish automation.
- `release-please-config.json` for release-please behavior.
- `package.json` for package metadata, scripts, and peer dependency ranges.
