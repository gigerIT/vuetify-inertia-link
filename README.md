# Vuetify Inertia Link
This is a simple Vue plugin that enables the use of Inertia links with Vuetify components.

It adds support for the Inertia route() helper function within the "to" prop of Vuetify components.

## Installation

```bash
npm install vuetify-inertia-link
```

```javascript
import VuetifyInertiaLink from 'vuetify-inertia-link';

app.use(VuetifyInertiaLink);
```

## Example app.js
```javascript
import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ZiggyVue } from '../../vendor/tightenco/ziggy/dist/vue.m';

import { createVuetify } from 'vuetify'
import VuetifyInertiaLink from "vuetify-inertia-link";

const vuetify = createVuetify({
    components,
    directives,
})
createInertiaApp({
    title: (title) => `${title}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.vue`, import.meta.glob('./Pages/**/*.vue')),
    setup({ el, App, props, plugin }) {
        return createApp({ render: () => h(App, props) })
            .use(plugin)
            .use(ZiggyVue)
            .use(vuetify)
            .use(VuetifyInertiaLink)
            .mount(el);
    },
});
```


## Usage
```html
<template>
  <v-btn :to="route('dashboard')">Home</v-btn>
</template>
```

or as a menu:
```html
<template>
    <v-list>
        <v-list-item :to="route('dashboard')">
            <v-list-item-title>Dashboard</v-list-item-title>
        </v-list-item>
        <v-list-item :to="route('user')">
            <v-list-item-title>User</v-list-item-title>
        </v-list-item>
        <v-list-item :to="route('about')">
            <v-list-item-title>About</v-list-item-title>
        </v-list-item>
    </v-list>
</template>
```

## Prefetch Support

This plugin includes built-in support for [Inertia Prefetch](https://inertiajs.com/prefetching) functionality, following Inertia's exact implementation patterns.

### Default Behavior
By default, prefetching is **disabled** for all links (matching Inertia's behavior):

```html
<template>
  <!-- This link will NOT prefetch by default -->
  <v-btn :to="route('dashboard')">Dashboard</v-btn>
</template>
```

### Enabling Prefetch
You can enable prefetching for specific links using the `prefetch` prop:

```html
<template>
  <!-- Enable hover prefetching (default mode when prefetch=true) -->
  <v-btn :to="route('dashboard')" :prefetch="true">Dashboard</v-btn>
  
  <!-- Or explicitly specify hover mode -->
  <v-btn :to="route('dashboard')" prefetch="hover">Dashboard</v-btn>
</template>
```

### Prefetch Modes
The plugin supports multiple prefetch modes, just like Inertia:

```html
<template>
  <!-- Prefetch on hover (75ms delay) -->
  <v-btn :to="route('dashboard')" prefetch="hover">Dashboard</v-btn>
  
  <!-- Prefetch on mousedown/click -->
  <v-btn :to="route('dashboard')" prefetch="click">Dashboard</v-btn>
  
  <!-- Prefetch immediately when component mounts -->
  <v-btn :to="route('dashboard')" prefetch="mount">Dashboard</v-btn>
  
  <!-- Multiple modes -->
  <v-btn :to="route('dashboard')" :prefetch="['hover', 'click']">Dashboard</v-btn>
</template>
```

### Caching
Prefetched responses are cached for 30 seconds by default. You can customize this:

```html
<template>
  <!-- Cache for 60 seconds (60000ms) -->
  <v-btn :to="route('dashboard')" :prefetch="true" :cache-for="60000">Dashboard</v-btn>
</template>
```

### How It Works
- **Hover mode**: Prefetching is triggered 75ms after hovering over a link (matches Inertia's timing)
- **Click mode**: Prefetching happens on mousedown, navigation on mouseup for instant perceived performance
- **Mount mode**: Prefetching happens immediately when the component is rendered
- Prefetching is automatically cancelled when appropriate (e.g., mouse leaves in hover mode)
- Only works for links that point to different pages (not the current page)


Thank you to https://github.com/robjuz for the original idea and implementation posted on a github issue.
https://github.com/vuetifyjs/vuetify/issues/11573#issuecomment-1465046711