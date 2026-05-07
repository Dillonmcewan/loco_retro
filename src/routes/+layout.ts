// Yjs and y-indexeddb are browser-only in v1. Disable SSR + prerender globally
// rather than per-route — re-enable for individual routes (e.g. a static
// marketing landing page) when there's a reason to.
export const ssr = false;
export const prerender = false;
