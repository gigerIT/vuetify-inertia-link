import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, createApp, nextTick, ref } from 'vue';

const page = ref({ url: '/dashboard' });

const router = {
    visit: vi.fn(),
    prefetch: vi.fn(),
};

const config = {
    get: vi.fn(key => {
        if (key === 'prefetch.cacheFor') {
            return 30000;
        }

        if (key === 'prefetch.hoverDelay') {
            return 75;
        }

        return undefined;
    }),
};

vi.mock('@inertiajs/vue3', () => ({
    config,
    router,
    usePage: () => page.value,
}));

const { default: VuetifyInertiaLink } = await import('../index.js');

function getRouterLink() {
    let component;

    VuetifyInertiaLink.install({
        component(name, value) {
            if (name === 'RouterLink') {
                component = value;
            }
        },
    });

    return component;
}

function createUseLinkResult(to, extraProps = {}) {
    const RouterLink = getRouterLink();
    const toRef = ref(to);
    const replaceRef = ref(extraProps.replace ?? false);
    let link;

    const host = document.createElement('div');
    const app = createApp({
        setup() {
            link = RouterLink.useLink({
                to: computed(() => toRef.value),
                replace: computed(() => replaceRef.value),
            });

            return () => null;
        },
    });

    document.body.appendChild(host);
    app.mount(host);

    return {
        link,
        scope: {
            stop() {
                app.unmount();
                host.remove();
            },
        },
        toRef,
        replaceRef,
    };
}

function clickEvent(overrides = {}) {
    return {
        altKey: false,
        button: 0,
        ctrlKey: false,
        currentTarget: document.createElement('a'),
        defaultPrevented: false,
        metaKey: false,
        preventDefault: vi.fn(),
        shiftKey: false,
        target: {},
        ...overrides,
    };
}

beforeEach(() => {
    page.value = { url: '/dashboard' };
    router.visit.mockClear();
    router.prefetch.mockClear();
    config.get.mockClear();
});

describe('VuetifyInertiaLink', () => {
    it('registers a RouterLink compatibility component', () => {
        expect(getRouterLink()).toHaveProperty('useLink');
    });

    it('visits simple GET links and exposes active state', () => {
        const { link, scope } = createUseLinkResult('/dashboard');
        const event = clickEvent();

        expect(link.route.value.href).toBe('/dashboard');
        expect(link.isActive.value).toBe(true);
        expect(link.isExactActive.value).toBe(true);

        link.navigate(event);

        expect(event.preventDefault).toHaveBeenCalledOnce();
        expect(router.visit).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
            data: {},
            method: 'get',
            preserveState: false,
            replace: false,
        }));

        scope.stop();
    });

    it('does not intercept modified or blank-target clicks', () => {
        const { link, scope } = createUseLinkResult('/dashboard');
        const modifiedEvent = clickEvent({ metaKey: true });
        const blankEvent = clickEvent({ currentTarget: { tagName: 'A', target: '_blank' } });

        link.navigate(modifiedEvent);
        link.navigate(blankEvent);

        expect(modifiedEvent.preventDefault).not.toHaveBeenCalled();
        expect(blankEvent.preventDefault).not.toHaveBeenCalled();
        expect(router.visit).not.toHaveBeenCalled();

        scope.stop();
    });

    it.each(['_parent', '_top', 'reports'])('leaves target="%s" to the browser', target => {
        const { link, scope } = createUseLinkResult('/reports');
        const anchor = document.createElement('a');
        anchor.target = target;
        const event = clickEvent({ currentTarget: anchor });

        link.navigate(event);

        expect(event.preventDefault).not.toHaveBeenCalled();
        expect(router.visit).not.toHaveBeenCalled();

        scope.stop();
    });

    it('preserves callback return values and tracks overlapping visits until both finish', async () => {
        const onBefore = vi.fn(() => false);
        const onHttpException = vi.fn(() => false);
        const onNetworkError = vi.fn(() => false);
        const onSuccess = vi.fn(() => Promise.resolve());
        const onError = vi.fn(() => Promise.resolve());
        const onFinish = vi.fn();
        const { link, scope } = createUseLinkResult({
            href: '/posts/1/like',
            method: 'post',
            onBefore,
            onHttpException,
            onNetworkError,
            onSuccess,
            onError,
            onFinish,
        });

        link.navigate(clickEvent());
        const [, options] = router.visit.mock.calls[0];

        expect(options.onBefore({})).toBe(false);
        expect(link.isLoading.value).toBe(false);
        expect(options.onHttpException({ status: 500 })).toBe(false);
        expect(options.onNetworkError(new Error('offline'))).toBe(false);
        await expect(options.onSuccess({})).resolves.toBeUndefined();
        await expect(options.onError({})).resolves.toBeUndefined();

        options.onStart({});
        options.onStart({});
        options.onFinish({});
        expect(link.isLoading.value).toBe(true);
        options.onFinish({});
        expect(link.isLoading.value).toBe(false);
        expect(onFinish).toHaveBeenCalledTimes(2);

        scope.stop();
    });

    it.each([
        { href: '/reports', prefetch: 'click' },
        { href: { url: '/reports', method: 'get' }, method: 'post' },
    ])('rejects optimistic GET descriptors before starting a request: %j', descriptor => {
        const optimistic = vi.fn();
        const { link, scope } = createUseLinkResult({ ...descriptor, optimistic });

        try {
            expect(() => link.navigate(clickEvent())).toThrow('Optimistic links require a non-GET method');
            expect(router.prefetch).not.toHaveBeenCalled();
            expect(router.visit).not.toHaveBeenCalled();
            expect(optimistic).not.toHaveBeenCalled();
            expect(link.isLoading.value).toBe(false);
        } finally {
            scope.stop();
        }
    });

    it('supports descriptors with non-GET methods and visit options', () => {
        const onStart = vi.fn();
        const onFinish = vi.fn();
        const { link, scope } = createUseLinkResult({
            href: '/logout',
            method: 'post',
            data: { reason: 'user' },
            preserveScroll: true,
            only: ['auth'],
            headers: { 'X-Test': 'yes' },
            async: true,
            viewTransition: true,
            onStart,
            onFinish,
        });
        const event = clickEvent({ currentTarget: { tagName: 'BUTTON' } });

        expect(link.href.value).toBe('#');
        expect(link.route.value.href).toBe('#');

        link.navigate(event);

        const [, options] = router.visit.mock.calls[0];

        expect(router.visit).toHaveBeenCalledWith('/logout', expect.objectContaining({
            async: true,
            data: { reason: 'user' },
            headers: { 'X-Test': 'yes' },
            method: 'post',
            only: ['auth'],
            preserveScroll: true,
            preserveState: true,
            viewTransition: true,
        }));

        options.onStart({});
        expect(link.isLoading.value).toBe(true);
        expect(onStart).toHaveBeenCalledOnce();

        options.onFinish({});
        expect(link.isLoading.value).toBe(false);
        expect(onFinish).toHaveBeenCalledOnce();

        scope.stop();
    });

    it('exposes safe browser hrefs for non-GET Wayfinder links', () => {
        const { link, scope } = createUseLinkResult({
            url: '/logout',
            method: 'post',
        });

        expect(link.href.value).toBe('#');
        expect(link.route.value.href).toBe('#');

        link.navigate(clickEvent({ currentTarget: { tagName: 'BUTTON' } }));

        expect(router.visit).toHaveBeenCalledWith('/logout', expect.objectContaining({
            method: 'post',
        }));

        scope.stop();
    });

    it('merges GET data into the query string', () => {
        const { link, scope } = createUseLinkResult({
            href: '/users?sort=name',
            data: { filter: 'active', tags: ['admin', 'staff'] },
        });

        expect(link.route.value.href).toBe('/users?sort=name&filter=active&tags[]=admin&tags[]=staff');

        link.navigate(clickEvent());

        expect(router.visit).toHaveBeenCalledWith(
            '/users?sort=name&filter=active&tags[]=admin&tags[]=staff',
            expect.objectContaining({ data: {} }),
        );

        scope.stop();
    });

    it('infers method, URL, and instant component from Wayfinder objects', () => {
        const { link, scope } = createUseLinkResult({
            href: { url: '/posts/1', method: 'get', component: 'Posts/Show' },
            instant: true,
            pageProps: { post: { id: 1 } },
        });

        link.navigate(clickEvent());

        expect(router.visit).toHaveBeenCalledWith('/posts/1', expect.objectContaining({
            component: 'Posts/Show',
            method: 'get',
            pageProps: { post: { id: 1 } },
        }));

        scope.stop();
    });

    it('lets explicit instant component override Wayfinder component', () => {
        const { link, scope } = createUseLinkResult({
            href: { url: '/dashboard', method: 'get', component: 'Dashboard/User' },
            component: 'Dashboard/Admin',
            instant: true,
        });

        link.navigate(clickEvent());

        expect(router.visit).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
            component: 'Dashboard/Admin',
        }));

        scope.stop();
    });

    it('prefetches mount links and forwards cache options', async () => {
        router.prefetch.mockImplementationOnce((_href, options) => {
            options.headers.Purpose = 'prefetch';
        });

        const { scope } = createUseLinkResult({
            href: '/reports',
            prefetch: 'mount',
            cacheFor: '1m',
            cacheTags: ['reports'],
            onPrefetching: vi.fn(),
            onPrefetched: vi.fn(),
        });

        await nextTick();

        expect(router.prefetch).toHaveBeenCalledWith(
            '/reports',
            expect.objectContaining({
                headers: { Purpose: 'prefetch' },
                method: 'get',
                onPrefetching: expect.any(Function),
                onPrefetched: expect.any(Function),
            }),
            { cacheFor: '1m', cacheTags: ['reports'] },
        );

        scope.stop();
    });

    it('uses fresh mutable headers for click prefetches without leaking into visits', async () => {
        router.prefetch.mockImplementationOnce((_href, options) => {
            options.headers.Purpose = 'prefetch';
        });

        const { link, scope } = createUseLinkResult({
            href: '/reports',
            prefetch: 'click',
        });

        expect(() => link.navigate(clickEvent())).not.toThrow();
        expect(router.visit).not.toHaveBeenCalled();

        await Promise.resolve();

        const [, prefetchOptions] = router.prefetch.mock.calls[0];
        const [, visitOptions] = router.visit.mock.calls[0];

        expect(prefetchOptions.headers).toEqual({ Purpose: 'prefetch' });
        expect(visitOptions.headers).toEqual({});
        expect(visitOptions.headers).not.toBe(prefetchOptions.headers);

        scope.stop();
    });

    it('defers click visits until after click prefetch registration', async () => {
        let prefetchRegistered = false;

        router.prefetch.mockImplementationOnce(() => {
            queueMicrotask(() => {
                prefetchRegistered = true;
            });
        });
        router.visit.mockImplementationOnce(() => {
            expect(prefetchRegistered).toBe(true);
        });

        const { link, scope } = createUseLinkResult({
            href: '/reports',
            prefetch: 'click',
        });

        link.navigate(clickEvent());

        expect(router.visit).not.toHaveBeenCalled();
        expect(router.prefetch).toHaveBeenCalledWith(
            '/reports',
            expect.any(Object),
            { cacheFor: 0, cacheTags: [] },
        );

        await Promise.resolve();

        expect(router.visit).toHaveBeenCalledOnce();

        scope.stop();
    });

    it('shares request controls with prefetches and respects global cache defaults', async () => {
        config.get.mockReturnValueOnce('2m');
        const { link, scope } = createUseLinkResult({
            href: '/reports',
            prefetch: ['mount', 'click'],
            preserveErrors: true,
            reset: ['reports'],
            fresh: true,
            invalidateCacheTags: ['reports'],
            showProgress: false,
        });

        const [, prefetchOptions, cacheOptions] = router.prefetch.mock.calls[0];
        expect(cacheOptions.cacheFor).toBe('2m');
        expect(prefetchOptions).toEqual(expect.objectContaining({
            preserveErrors: true,
            reset: ['reports'],
            fresh: true,
            invalidateCacheTags: ['reports'],
        }));
        expect(prefetchOptions).not.toHaveProperty('optimistic');
        expect(prefetchOptions).not.toHaveProperty('showProgress');

        link.navigate(clickEvent());
        await Promise.resolve();

        expect(router.visit).toHaveBeenCalledWith('/reports', expect.objectContaining({
            invalidateCacheTags: ['reports'],
            showProgress: false,
        }));

        scope.stop();
    });

    it('updates active state when the Inertia page URL changes', () => {
        const { link, scope } = createUseLinkResult('/settings');

        expect(link.isActive.value).toBe(false);
        expect(link.isExactActive.value).toBe(false);

        page.value = { url: '/settings/profile' };

        expect(link.isActive.value).toBe(true);
        expect(link.isExactActive.value).toBe(false);

        page.value = { url: '/settings' };

        expect(link.isExactActive.value).toBe(true);

        scope.stop();
    });
});
