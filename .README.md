# Vuetify Intertia Link
This is a simple Vue plugin that allows you to use Inertia links with Vuetify components.

Adds support of the Intertia route() helper function inside Vuetify's "to" prop.

## Installation

```bash
npm install vuetify-inertia-link
```

```javascript
import VuetifyInertiaLink from 'vuetify-intertia-link';

app.use(VuetifyInertiaLink);
```

## Example app.js
```javascript
import { createApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ZiggyVue } from '../../vendor/tightenco/ziggy/dist/vue.m';

import { createVuetify } from 'vuetify'
import VuetifyInertiaLink from "vuetify-intertia-link";

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