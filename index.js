import { router, usePage } from "@inertiajs/vue3";
import { computed } from "vue";

const VuetifyInertiaLink = {
    install(app) {
        app.component("RouterLink", {
            useLink(props) {
                const href = props.to.value;
                const currentUrl = computed(() => usePage().url);
                const prefetch = props.prefetch?.value ?? true; // Enable prefetch by default
                
                let prefetchTimeout = null;
                
                const handlePrefetch = () => {
                    if (prefetch && href !== currentUrl.value) {
                        // Clear any existing timeout
                        if (prefetchTimeout) {
                            clearTimeout(prefetchTimeout);
                        }
                        
                        // Prefetch after a small delay to avoid excessive requests
                        prefetchTimeout = setTimeout(() => {
                            router.prefetch(href);
                        }, 100);
                    }
                };
                
                const cancelPrefetch = () => {
                    if (prefetchTimeout) {
                        clearTimeout(prefetchTimeout);
                        prefetchTimeout = null;
                    }
                };
                
                return {
                    route: computed(() => ({ href })),
                    isActive: computed(() => currentUrl.value.startsWith(href)),
                    isExactActive: computed(() => href === currentUrl),
                    navigate(e) {
                        if (e.shiftKey || e.metaKey || e.ctrlKey) return;
                        e.preventDefault();
                        router.visit(href);
                    },
                    // Add prefetch event handlers
                    onMouseenter: handlePrefetch,
                    onFocus: handlePrefetch,
                    onMouseleave: cancelPrefetch,
                    onBlur: cancelPrefetch
                };
            }
        });
    }
};

export default VuetifyInertiaLink;
