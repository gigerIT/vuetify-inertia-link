# vuetify-inertia-link

Use Vuetify components with Inertia navigation.

This plugin registers a `RouterLink` compatibility component so Vuetify's `to` prop works in Inertia apps without Vue Router.

## Compatibility

- `vue`: `^3.0.0`
- `@inertiajs/vue3`: `^3.8.0`
- `vuetify`: `^3.5.14 || ^4.0.0`

Version 3 of this package targets Inertia v3 only. Use version 2 when your app still needs Inertia v2 support.

Inertia 3.8.0 is required to preserve prefetch reuse when visit error callbacks are supplied. This also provides native browser target handling (`_blank`, `_parent`, `_top`, and named windows) and the latest optimistic update fixes. Your Vue version must also satisfy Vuetify's peer requirement: Vue 3.3+ for Vuetify 3.5.14, or Vue 3.5+ for Vuetify 4.0.0.

## Installation

```bash
npm install vuetify-inertia-link
```

If needed, install peer dependencies:

```bash
npm install vue @inertiajs/vue3 vuetify
```

## Setup

Register the plugin once when you bootstrap your Inertia app.

```js
import { createApp, h } from 'vue'
import { createInertiaApp } from '@inertiajs/vue3'
import { createVuetify } from 'vuetify'
import VuetifyInertiaLink from 'vuetify-inertia-link'

const vuetify = createVuetify()

createInertiaApp({
  resolve: name => {
    const pages = import.meta.glob('./Pages/**/*.vue')
    return pages[`./Pages/${name}.vue`]()
  },
  setup({ el, App, props, plugin }) {
    return createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(vuetify)
      .use(VuetifyInertiaLink)
      .mount(el)
  },
})
```

Adjust the page resolver to your application's directory structure. If your app uses `@inertiajs/vite` for automatic setup and page resolution, register the plugins through `withApp` instead:

```js
createInertiaApp({
  withApp(app) {
    app.use(vuetify).use(VuetifyInertiaLink)
  },
})
```

For manual SSR setup, register both plugins in the server entry point too.

## Usage

Use `to` as you normally would with Vuetify links.

```vue
<template>
  <v-btn :to="route('dashboard')">Dashboard</v-btn>
  <v-btn to="/settings">Settings</v-btn>
</template>
```

```vue
<template>
  <v-list nav>
    <v-list-item :to="route('dashboard')" title="Dashboard" />
    <v-list-item :to="route('users.index')" title="Users" />
    <v-list-item :to="route('about')" title="About" />
  </v-list>
</template>
```

## Inertia Link Options

For Inertia v3 link options, pass an object to Vuetify's `to` prop. The object must contain `href` plus any Inertia link options you need.

```vue
<template>
  <v-btn
    :to="{
      href: '/users',
      data: { active: true },
      only: ['users'],
      preserveScroll: true,
    }"
  >
    Active users
  </v-btn>
</template>
```

Non-GET requests are supported. Like Inertia's official `<Link>`, non-GET visits preserve state by default.

```vue
<template>
  <v-btn
    :to="{
      href: '/logout',
      method: 'post',
      data: { source: 'menu' },
    }"
  >
    Logout
  </v-btn>
</template>
```

Supported descriptor fields:

- `href`, `method`, `data`, `replace`, `preserveScroll`, `preserveState`, `preserveUrl`, `preserveErrors`
- `only`, `except`, `reset`, `fresh`, `headers`, `errorBag`, `forceFormData`, `queryStringArrayFormat`
- `async`, `showProgress`, `viewTransition`, `optimistic`, `component`, `instant`, `pageProps`
- `prefetch`, `cacheFor`, `cacheTags`, `invalidateCacheTags`
- `onBefore`, `onBeforeUpdate`, `onStart`, `onProgress`, `onFinish`, `onCancel`, `onSuccess`, `onError`, `onHttpException`, `onNetworkError`, `onFlash`, `onCancelToken`, `onPrefetching`, `onPrefetched`

Visit options are handled by Inertia. For example, use `reset: ['users']` when changing a paginated list's filters, `preserveErrors: true` to retain validation errors during a partial reload, or `invalidateCacheTags: ['users']` after a mutation. `onBefore`, `onHttpException`, and `onNetworkError` retain Inertia's `false` return semantics; promises returned by `onSuccess` and `onError` are passed through.

## Optimistic Updates

Pass an `optimistic` callback on a non-GET descriptor to update page props immediately. Inertia handles the server response and rolls back the update if the request fails.

```vue
<template>
  <v-btn
    :to="{
      href: '/posts/1/like',
      method: 'post',
      optimistic: props => ({
        post: { ...props.post, likes: props.post.likes + 1 },
      }),
      invalidateCacheTags: ['posts'],
    }"
  >
    Like
  </v-btn>
</template>
```

When omitted, `async` and `showProgress` use Inertia's defaults, including asynchronous optimistic requests with progress enabled. Explicit values take priority over those defaults.

Optimistic GET descriptors throw an error before starting a visit. Inertia 3.8.0 can consume a shared GET prefetch without running optimistic rollback when that prefetch fails, even if another link started it. Use a non-GET method for optimistic actions.

## Wayfinder

Inertia v3 Wayfinder objects can be passed directly as a simple `to` value or as a descriptor `href`.

```vue
<script setup>
import { show } from 'App/Http/Controllers/UserController'
</script>

<template>
  <v-btn :to="show(1)">View user</v-btn>

  <v-btn
    :to="{
      href: show(1),
      preserveScroll: true,
    }"
  >
    View user without scrolling
  </v-btn>
</template>
```

## Instant Visits

Instant visits are supported through Inertia v3's `component` and `pageProps` visit options.

```vue
<template>
  <v-btn
    :to="{
      href: '/posts/1',
      instant: true,
      component: 'Posts/Show',
      pageProps: { post: { id: 1 } },
    }"
  >
    Open post
  </v-btn>
</template>
```

When `href` is a Wayfinder object and `instant` is `true`, this package uses the component name from the Wayfinder route definition. An explicit `component` value takes priority.

## Prefetching

`mount` and `click` prefetch modes are supported for GET links through Vuetify's `to` prop. Inertia rejects prefetching for non-GET requests.

`invalidateCacheTags` is passed consistently to the prefetch and the visit so Inertia can reuse the cached response. Inertia invalidates those tags only when the visit succeeds; prefetching alone does not invalidate them.

```vue
<template>
  <v-list-item
    :to="{
      href: '/reports',
      prefetch: 'mount',
      cacheFor: '1m',
      cacheTags: ['reports'],
    }"
    title="Reports"
  />
</template>
```

Vuetify's RouterLink compatibility API does not pass hover events from Vuetify components back to this adapter. Because of that, `prefetch: true` and `prefetch: 'hover'` cannot behave like Inertia's official `<Link>` when used through Vuetify's `to` prop. Use `prefetch: 'mount'`, `prefetch: 'click'`, or Inertia's official `<Link>` directly when hover prefetching is required.

Here, `click` prefetch starts when Vuetify calls `navigate` on click. The visit follows in a microtask so Inertia can register and reuse the prefetch. Inertia's official `<Link>` can start earlier, on mousedown; Vuetify does not forward that event to this adapter.

## Notes

- This package focuses on navigation via Vuetify's `to` prop.
- `route()` in the examples comes from Ziggy in Laravel projects.
- Active styling compares the target URL with `usePage().url`. With Inertia's default relative page URLs, use relative targets such as `/users` or `route('users.index', {}, false)` for active matching. Absolute URLs still navigate, but do not match a relative page URL.
- Vuetify renders its own elements and does not consume this adapter's loading ref. Bind Vuetify's `loading` prop using visit callbacks if you need a loading indicator; Inertia's `<Link>` `data-loading` attribute is not added automatically.
- The official Inertia `<Link>` component is still the best choice when you need exact DOM-level Inertia link behavior outside a Vuetify component.

## Maintainer workflow

Run `$inertia-updates` in Codex to review official Inertia changes, implement relevant compatible updates, and save an incremental checkpoint. Use `$inertia-updates plan only` for a report without implementation, or `$inertia-updates full review` to revisit the complete relevant surface.

The [project skill](.agents/skills/inertia-updates/SKILL.md) keeps its history in `.agents/inertia-updates/`; the first run establishes the baseline. The official Inertia documentation MCP is configured in `.codex/config.toml`. Start a new Codex session in this trusted project to load it. The skill also supports official documentation and source fallbacks when MCP is unavailable.
