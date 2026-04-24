# vuetify-inertia-link

Use Vuetify components with Inertia navigation.

This plugin registers a `RouterLink` compatibility component so Vuetify's `to` prop works in Inertia apps without Vue Router.

## Compatibility

- `vue`: `^3.0.0`
- `@inertiajs/vue3`: `^3.0.0`
- `vuetify`: `^3.5.14 || ^4.0.0`

Version 3 of this package targets Inertia v3 only. Use version 2 when your app still needs Inertia v2 support.

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
  setup({ el, App, props, plugin }) {
    return createApp({ render: () => h(App, props) })
      .use(plugin)
      .use(vuetify)
      .use(VuetifyInertiaLink)
      .mount(el)
  },
})
```

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

- `href`, `method`, `data`, `replace`, `preserveScroll`, `preserveState`, `preserveUrl`
- `only`, `except`, `headers`, `queryStringArrayFormat`, `async`, `viewTransition`
- `component`, `instant`, `pageProps`
- `prefetch`, `cacheFor`, `cacheTags`
- `onBefore`, `onStart`, `onProgress`, `onFinish`, `onCancel`, `onSuccess`, `onError`, `onCancelToken`, `onPrefetching`, `onPrefetched`

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

`mount` and `click` prefetch modes are supported through Vuetify's `to` prop.

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

## Notes

- This package focuses on navigation via Vuetify's `to` prop.
- `route()` in the examples comes from Ziggy in Laravel projects.
- The official Inertia `<Link>` component is still the best choice when you need exact DOM-level Inertia link behavior outside a Vuetify component.
