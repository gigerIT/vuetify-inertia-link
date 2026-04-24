import {
    isUrlMethodPair,
    mergeDataIntoQueryString,
    resolveUrlMethodPairComponent,
    shouldIntercept,
} from '@inertiajs/core';
import { config, router, usePage } from '@inertiajs/vue3';
import { computed, onMounted, shallowRef, unref } from 'vue';

const emptyArray = Object.freeze([]);
const noop = () => {};
const defer = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : callback => Promise.resolve().then(callback);

function isPlainObject(value) {
    return value !== null
        && typeof value === 'object'
        && !Array.isArray(value)
        && !(typeof URL !== 'undefined' && value instanceof URL);
}

function isLinkDescriptor(value) {
    return isPlainObject(value) && 'href' in value;
}

function normalizeTo(value) {
    const to = unref(value);

    if (isLinkDescriptor(to)) {
        return {
            ...to,
            href: to.href ?? '',
        };
    }

    return {
        href: to ?? '',
    };
}

function getMethod(href, method) {
    if (isUrlMethodPair(href)) {
        return href.method.toLowerCase();
    }

    return (method ?? 'get').toLowerCase();
}

function getHref(href) {
    if (isUrlMethodPair(href)) {
        return href.url;
    }

    return href;
}

function normalizePrefetchModes(prefetch) {
    if (prefetch === true) {
        return ['hover'];
    }

    if (prefetch === false || prefetch === undefined || prefetch === null) {
        return [];
    }

    if (Array.isArray(prefetch)) {
        return prefetch;
    }

    return [prefetch];
}

function shouldHandleClick(event) {
    return shouldIntercept(event) && event.currentTarget?.target !== '_blank';
}

function getConfigValue(key, fallback) {
    if (typeof config?.get !== 'function') {
        return fallback;
    }

    return config.get(key) ?? fallback;
}

function isUrlActive(currentUrl, href, exact) {
    if (!href) {
        return false;
    }

    if (exact) {
        return currentUrl === href;
    }

    if (currentUrl === href) {
        return true;
    }

    if (!currentUrl.startsWith(href)) {
        return false;
    }

    return ['/', '?', '#'].includes(currentUrl.charAt(href.length));
}

function createLinkOptions(link, method, data, replace) {
    return {
        data,
        method,
        replace: link.replace ?? replace ?? false,
        preserveScroll: link.preserveScroll ?? false,
        preserveState: link.preserveState ?? method !== 'get',
        preserveUrl: link.preserveUrl ?? false,
        only: link.only ?? emptyArray,
        except: link.except ?? emptyArray,
        headers: link.headers ?? {},
        queryStringArrayFormat: link.queryStringArrayFormat ?? 'brackets',
        async: link.async ?? false,
        component: link.component ?? (link.instant && isUrlMethodPair(link.href) ? resolveUrlMethodPairComponent(link.href) : null),
        pageProps: link.pageProps ?? null,
    };
}

function cloneVisitOptions(options) {
    return {
        ...options,
        headers: { ...(options.headers ?? {}) },
    };
}

function createVisitOptions(link, baseOptions, setLoading) {
    return {
        ...baseOptions,
        viewTransition: link.viewTransition ?? false,
        onCancelToken: link.onCancelToken ?? noop,
        onBefore: link.onBefore ?? noop,
        onStart: visit => {
            setLoading(1);
            link.onStart?.(visit);
        },
        onProgress: link.onProgress ?? noop,
        onFinish: visit => {
            setLoading(-1);
            link.onFinish?.(visit);
        },
        onCancel: link.onCancel ?? noop,
        onSuccess: link.onSuccess ?? noop,
        onError: link.onError ?? noop,
    };
}

const VuetifyInertiaLink = {
    install(app) {
        app.component('RouterLink', {
            useLink(props) {
                const inFlightCount = shallowRef(0);
                const link = computed(() => normalizeTo(props.to));
                const method = computed(() => getMethod(link.value.href, link.value.method));
                const rawHref = computed(() => getHref(link.value.href));
                const queryStringArrayFormat = computed(() => link.value.queryStringArrayFormat ?? 'brackets');
                const mergedData = computed(() => mergeDataIntoQueryString(
                    method.value,
                    rawHref.value,
                    link.value.data ?? {},
                    queryStringArrayFormat.value,
                ));
                const href = computed(() => mergedData.value[0]);
                const data = computed(() => mergedData.value[1]);
                const browserHref = computed(() => method.value === 'get' ? href.value : '#');
                const currentUrl = computed(() => usePage().url);
                const prefetchModes = computed(() => normalizePrefetchModes(link.value.prefetch));
                const cacheFor = computed(() => {
                    if (link.value.cacheFor !== undefined && link.value.cacheFor !== 0) {
                        return link.value.cacheFor;
                    }

                    if (prefetchModes.value.length === 1 && prefetchModes.value[0] === 'click') {
                        return 0;
                    }

                    return getConfigValue('prefetch.cacheFor', 30000);
                });
                const baseOptions = computed(() => createLinkOptions(link.value, method.value, data.value, unref(props.replace)));
                const visitOptions = computed(() => createVisitOptions(link.value, baseOptions.value, delta => {
                    inFlightCount.value += delta;
                }));
                const prefetchOptions = computed(() => ({
                    ...baseOptions.value,
                    onPrefetching: link.value.onPrefetching ?? noop,
                    onPrefetched: link.value.onPrefetched ?? noop,
                }));

                function prefetch() {
                    router.prefetch(href.value, cloneVisitOptions(prefetchOptions.value), {
                        cacheFor: cacheFor.value,
                        cacheTags: link.value.cacheTags ?? emptyArray,
                    });
                }

                function navigate(event) {
                    if (!shouldHandleClick(event)) {
                        return;
                    }

                    event.preventDefault();

                    if (prefetchModes.value.includes('click')) {
                        prefetch();

                        defer(() => {
                            router.visit(href.value, cloneVisitOptions(visitOptions.value));
                        });

                        return;
                    }

                    router.visit(href.value, cloneVisitOptions(visitOptions.value));
                }

                onMounted(() => {
                    if (prefetchModes.value.includes('mount')) {
                        prefetch();
                    }
                });

                return {
                    route: computed(() => ({ href: browserHref.value })),
                    href: browserHref,
                    isActive: computed(() => isUrlActive(currentUrl.value, href.value, false)),
                    isExactActive: computed(() => isUrlActive(currentUrl.value, href.value, true)),
                    isLoading: computed(() => inFlightCount.value > 0),
                    navigate,
                };
            },
        });
    },
};

export default VuetifyInertiaLink;
