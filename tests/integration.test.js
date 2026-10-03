import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, shallowRef } from 'vue';
import { config, createInertiaApp, http, router, usePage } from '@inertiajs/vue3';
import { createVuetify } from 'vuetify';
import { VBtn } from 'vuetify/components/VBtn';
import { VListItem } from 'vuetify/components/VList';
import VuetifyInertiaLink from '../index.js';

let app;
let host;
let requests;
let originalClient;
const target = shallowRef('');
const attrs = shallowRef({});
const renderedComponent = shallowRef(VBtn);

function pageResponse(url = '/start', props = {}, flash = {}, status = 200) {
    return {
        status,
        headers: { 'x-inertia': 'true' },
        data: JSON.stringify({
            component: 'Test',
            url,
            version: null,
            props: { errors: {}, count: 1, ...props },
            flash,
        }),
    };
}

async function mountLink(to, { component = VBtn, props = {}, initialProps = {}, defaults = {} } = {}) {
    config.replace(defaults);
    target.value = to;
    attrs.value = props;
    renderedComponent.value = component;

    await new Promise(resolve => router.replace({
        url: '/start',
        component: 'Test',
        props: { errors: {}, count: 1, ...initialProps },
        flash: {},
        onFinish: resolve,
    }));
    await nextTick();

    return { target, attrs };
}

beforeAll(async () => {
    originalClient = http.getClient();
    window.history.replaceState({}, '', '/start');
    host = document.createElement('div');
    host.id = 'app';
    document.body.appendChild(host);
    const pageComponent = {
        setup() {
            return () => h(renderedComponent.value, { to: target.value, ripple: false, ...attrs.value }, {
                default: () => 'Navigate',
            });
        },
    };

    await createInertiaApp({
        page: {
            component: 'Test',
            url: '/start',
            version: null,
            props: { errors: {}, count: 1 },
            flash: {},
        },
        resolve: () => pageComponent,
        progress: false,
        http: {
            request(config) {
                return new Promise((resolve, reject) => {
                    requests.push({ config, resolve, reject });
                });
            },
        },
        setup({ el, App, props: appProps, plugin }) {
            app = createApp({ render: () => h(App, appProps) })
                .use(plugin)
                .use(createVuetify({ theme: false }))
                .use(VuetifyInertiaLink);
            app.mount(el);
        },
    });

    // Let Inertia complete the initial page/history update before clicking.
    await vi.waitFor(() => expect(window.history.state?.page?.url).toBe('/start'));
    await nextTick();
});

function click() {
    const anchor = host.querySelector('a');
    let intercepted;
    // Observe Vuetify's handler, then suppress jsdom's unsupported native navigation.
    anchor.addEventListener('click', event => {
        intercepted = event.defaultPrevented;
        event.preventDefault();
    }, { once: true });
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    return intercepted;
}

beforeEach(() => {
    requests = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
    router.cancelAll();
    router.flushAll();
    vi.restoreAllMocks();
});

afterAll(() => {
    http.setClient(originalClient);
    app?.unmount();
    host.remove();
});

describe('real Inertia and Vuetify integration', () => {
    it.each([['VBtn', VBtn], ['VListItem', VListItem]])('%s preserves browser targets and visit cancellation', async (_name, component) => {
        const onBefore = vi.fn(() => false);
        const onStart = vi.fn();
        const { attrs } = await mountLink({ href: '/reports', onBefore, onStart }, { component });

        for (const target of ['', '_self', '_blank', '_parent', '_top', 'reports']) {
            attrs.value = { target };
            await nextTick();
            onBefore.mockClear();

            const handled = target === '' || target === '_self';
            expect(click()).toBe(handled);
            expect(onBefore).toHaveBeenCalledTimes(handled ? 1 : 0);
        }

        expect(onStart).not.toHaveBeenCalled();
        expect(requests).toHaveLength(0);
    });

    it('applies partial request controls, preserves errors, and delivers update/flash callbacks', async () => {
        const onBeforeUpdate = vi.fn();
        const onFlash = vi.fn();
        const onError = vi.fn();
        const onFinish = vi.fn();
        await mountLink({
            href: '/start',
            method: 'post',
            data: { tags: ['staff'] },
            forceFormData: true,
            queryStringArrayFormat: 'indices',
            only: ['count'],
            reset: ['posts'],
            fresh: true,
            preserveErrors: true,
            errorBag: 'update',
            onBeforeUpdate,
            onFlash,
            onError,
            onFinish,
        }, {
            initialProps: { errors: { update: { title: 'Required' } } },
            defaults: {
                visitOptions: (_href, options) => ({
                    headers: { ...options.headers, 'X-Configured': 'yes' },
                }),
            },
        });

        expect(host.querySelector('a').getAttribute('href')).toBe('#');
        click();
        await vi.waitFor(() => expect(requests).toHaveLength(1));

        const { config, resolve } = requests[0];
        expect(config.method).toBe('post');
        expect(config.data).toBeInstanceOf(FormData);
        expect(config.data.get('tags[0]')).toBe('staff');
        expect(config.headers).toMatchObject({
            'X-Inertia-Partial-Data': 'count,posts',
            'X-Inertia-Reset': 'posts',
            'X-Inertia-Error-Bag': 'update',
            'X-Configured': 'yes',
        });

        resolve(pageResponse('/start', { count: 2, posts: [] }, { message: 'Updated' }));
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());

        expect(usePage().props.count).toBe(2);
        expect(usePage().props.errors).toEqual({ update: { title: 'Required' } });
        expect(onError).toHaveBeenCalledWith({ title: 'Required' });
        expect(onBeforeUpdate).toHaveBeenCalledOnce();
        expect(onFlash).toHaveBeenCalledWith({ message: 'Updated' });
    });

    it.each([
        [{}, true, true],
        [{ async: false, showProgress: false }, false, false],
    ])('lets Inertia apply and roll back optimistic updates with options %j', async (overrides, async, showProgress) => {
        const onBefore = vi.fn();
        const onNetworkError = vi.fn(() => false);
        const onFinish = vi.fn();
        const globalError = vi.fn();
        const removeListener = router.on('networkError', globalError);
        try {
            await mountLink({
                href: '/start',
                method: 'post',
                optimistic: props => ({ count: props.count + 1 }),
                onBefore,
                onNetworkError,
                onFinish,
                ...overrides,
            });

            click();
            await vi.waitFor(() => expect(usePage().props.count).toBe(2));
            expect(onBefore).toHaveBeenCalledWith(expect.objectContaining({ async, showProgress }));
            await vi.waitFor(() => expect(requests).toHaveLength(1));

            const error = new Error('offline');
            requests[0].reject(error);
            await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());

            expect(onNetworkError).toHaveBeenCalledWith(error);
            expect(globalError).not.toHaveBeenCalled();
            expect(usePage().props.count).toBe(1);
        } finally {
            removeListener();
        }
    });

    it('honors HTTP exception cancellation without rendering the error response', async () => {
        const onHttpException = vi.fn(() => false);
        const onFinish = vi.fn();
        await mountLink({ href: '/failed', onHttpException, onFinish });
        click();
        await vi.waitFor(() => expect(requests).toHaveLength(1));

        requests[0].resolve(pageResponse('/failed', { count: 99 }, {}, 500));
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());

        expect(onHttpException).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
        expect(usePage().url).toBe('/start');
        expect(usePage().props.count).toBe(1);
    });

    it('uses the consuming adapter configuration for mount-prefetch lifetime', async () => {
        const onPrefetched = vi.fn();
        await mountLink({ href: '/cached', prefetch: 'mount', onPrefetched }, {
            defaults: { prefetch: { cacheFor: '2m' } },
        });
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        requests[0].resolve(pageResponse('/cached'));
        await vi.waitFor(() => expect(onPrefetched).toHaveBeenCalledOnce());

        const cached = router.getCached('/cached');
        expect(cached).not.toBeNull();
        // The default is 30 seconds; the adapter's configured value is two minutes.
        expect(cached.staleTimestamp - Date.now()).toBeGreaterThan(90000);
    });

    it('rejects an optimistic GET before it can consume another link\'s prefetch', async () => {
        const onFinish = vi.fn();
        await mountLink({ href: '/reports', prefetch: 'mount', cacheFor: '1m' });
        await vi.waitFor(() => expect(requests).toHaveLength(1));

        // The prefetch remains in flight when a different descriptor becomes optimistic.
        target.value = {
            href: '/reports',
            optimistic: props => ({ count: props.count + 1 }),
            onFinish,
        };
        await nextTick();
        const originalErrorHandler = app.config.errorHandler;
        const onComponentError = vi.fn();
        app.config.errorHandler = onComponentError;
        try {
            click();
            // The independent prefetch can still finish and populate the cache.
            requests[0].resolve(pageResponse('/reports'));
            await vi.waitFor(() => expect(router.getCached('/reports')).not.toBeNull());

            expect(onComponentError).toHaveBeenCalledWith(
                expect.objectContaining({ message: expect.stringContaining('Optimistic links require a non-GET method') }),
                expect.anything(),
                expect.any(String),
            );
            expect(usePage().props.count).toBe(1);
            expect(usePage().url).toBe('/start');
            expect(onFinish).not.toHaveBeenCalled();
            expect(requests).toHaveLength(1);
        } finally {
            app.config.errorHandler = originalErrorHandler;
        }
    });

    it('reuses a prefetch with invalidation tags and invalidates only when visited', async () => {
        const onPrefetched = vi.fn();
        const onFinish = vi.fn();
        const invalidateCacheTags = ['reports'];
        await mountLink({
            href: '/reports',
            prefetch: ['mount', 'click'],
            cacheFor: '1m',
            cacheTags: ['reports'],
            invalidateCacheTags,
            onPrefetched,
            onFinish,
        });
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        requests[0].resolve(pageResponse('/reports'));
        await vi.waitFor(() => expect(onPrefetched).toHaveBeenCalledOnce());

        expect(router.getCached('/reports', { invalidateCacheTags })).not.toBeNull();
        expect(usePage().url).toBe('/start');
        click();
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());

        expect(onPrefetched).toHaveBeenCalledOnce();
        expect(requests).toHaveLength(1);
        expect(usePage().url).toBe('/reports');
        expect(router.getCached('/reports', { invalidateCacheTags })).toBeNull();
    });

    it('reuses click prefetches and invalidates tagged caches after a successful mutation', async () => {
        const onFinish = vi.fn();
        const headers = Object.freeze({ 'X-Link': 'reports' });
        const invalidateCacheTags = ['stale-reports'];
        const { target } = await mountLink({
            href: '/reports',
            prefetch: 'click',
            cacheFor: '1m',
            cacheTags: ['reports'],
            invalidateCacheTags,
            headers,
            onFinish,
        });

        const anchor = host.querySelector('a');
        anchor.dispatchEvent(new MouseEvent('mouseenter'));
        anchor.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        expect(requests).toHaveLength(0);
        click();
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        expect(requests[0].config.headers.Purpose).toBe('prefetch');

        requests[0].resolve(pageResponse('/reports'));
        await vi.waitFor(() => expect(usePage().url).toBe('/reports'));
        expect(onFinish).toHaveBeenCalledOnce();
        expect(requests).toHaveLength(1);
        expect(headers).toEqual({ 'X-Link': 'reports' });
        expect(router.getCached('/reports', { headers: { ...headers }, invalidateCacheTags })).not.toBeNull();

        onFinish.mockClear();
        target.value = { href: '/reports/update', method: 'post', invalidateCacheTags: ['reports'], onFinish };
        await nextTick();
        click();
        await vi.waitFor(() => expect(requests).toHaveLength(2));
        expect(requests[1].config.headers).not.toHaveProperty('Purpose');

        requests[1].resolve(pageResponse('/start'));
        await vi.waitFor(() => expect(onFinish).toHaveBeenCalledOnce());
        expect(router.getCached('/reports', { headers: { ...headers }, invalidateCacheTags })).toBeNull();
    });
});
