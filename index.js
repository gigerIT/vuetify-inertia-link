import { router, usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const VuetifyInertiaLink = {
    install(app) {
        app.component("RouterLink", {
            useLink(props) {
                const href = props.to.value;
                const currentUrl = computed(() => usePage().url);
                
                // Default prefetch to false, following Inertia's behavior
                const prefetch = props.prefetch?.value ?? false;
                const cacheFor = props.cacheFor?.value ?? 30000; // Default 30 seconds like Inertia
                
                let hoverTimeout = null;
                
                // Determine prefetch modes based on prefetch prop
                const prefetchModes = computed(() => {
                    if (prefetch === true) {
                        return ['hover'];
                    }
                    
                    if (prefetch === false) {
                        return [];
                    }
                    
                    if (Array.isArray(prefetch)) {
                        return prefetch;
                    }
                    
                    return [prefetch];
                });
                
                const doPrefetch = () => {
                    if (href !== currentUrl.value) {
                        router.prefetch(href, {}, { cacheFor });
                    }
                };
                
                // Regular click handlers without prefetch
                const regularEvents = {
                    onClick: (event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey) return;
                        event.preventDefault();
                        router.visit(href);
                    }
                };
                
                // Hover prefetch event handlers
                const prefetchHoverEvents = {
                    onMouseenter: () => {
                        hoverTimeout = setTimeout(() => {
                            doPrefetch();
                        }, 75); // Match Inertia's 75ms timeout
                    },
                    onMouseleave: () => {
                        if (hoverTimeout) {
                            clearTimeout(hoverTimeout);
                            hoverTimeout = null;
                        }
                    },
                    onClick: regularEvents.onClick
                };
                
                // Click prefetch event handlers
                const prefetchClickEvents = {
                    onMousedown: (event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey) return;
                        event.preventDefault();
                        doPrefetch();
                    },
                    onMouseup: (event) => {
                        event.preventDefault();
                        router.visit(href);
                    },
                    onClick: (event) => {
                        if (event.shiftKey || event.metaKey || event.ctrlKey) return;
                        // Let the mouseup event handle the visit
                        event.preventDefault();
                    }
                };
                
                // Handle mount prefetching
                if (prefetchModes.value.includes('mount')) {
                    // Vue 3 doesn't have a direct onMounted in this context,
                    // but we can prefetch immediately
                    doPrefetch();
                }
                
                // Determine which event handlers to use
                const eventHandlers = (() => {
                    if (prefetchModes.value.includes('hover')) {
                        return prefetchHoverEvents;
                    }
                    
                    if (prefetchModes.value.includes('click')) {
                        return prefetchClickEvents;
                    }
                    
                    return regularEvents;
                })();
                
                return {
                    route: computed(() => ({ href })),
                    isActive: computed(() => currentUrl.value.startsWith(href)),
                    isExactActive: computed(() => href === currentUrl.value),
                    navigate: eventHandlers.onClick,
                    ...eventHandlers
                };
            }
        });
    }
};

export default VuetifyInertiaLink;
