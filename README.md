# Vuetify Intertia Link
This is a simple Vue plugin that enables the use of Inertia links with Vuetify components.

It adds support for the Inertia route() helper function within the "to" prop of Vuetify components.

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


Thank you to https://github.com/robjuz for the original idea and implementation posted on a github issue.
https://github.com/vuetifyjs/vuetify/issues/11573#issuecomment-1465046711