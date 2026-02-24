# vuetify-inertia-link

Use Vuetify components with Inertia navigation.

This plugin registers a `RouterLink` compatibility component so Vuetify's `to` prop works in Inertia apps (without Vue Router).

## Compatibility

- `vue`: `^3.0.0`
- `@inertiajs/vue3`: `^2.0.0`
- `vuetify`: `^3.5.14 || ^4.0.0`

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

## Notes

- This package focuses on navigation via Vuetify's `to` prop.
- `route()` in the examples comes from Ziggy in Laravel projects.
- For non-GET requests (for example logout via POST), use Inertia `Link` or `router.*` methods directly.