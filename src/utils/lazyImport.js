import { lazy } from 'react';

/**
 * A wrapper around React.lazy that automatically reloads the page
 * if a dynamic import fails (e.g., due to a new deployment).
 *
 * @param {Function} factory - The dynamic import function (e.g., () => import('./Page'))
 */
export const lazyImport = (factory) => {
    return lazy(async () => {
        try {
            return await factory();
        } catch (error) {
            const isChunkLoadError = error.message.includes('dynamically imported module') ||
                error.message.includes('Importing a module script failed') ||
                error.name === 'ChunkLoadError';

            if (isChunkLoadError) {
                const storageKey = 'app-version-mismatch-reload';
                const lastReload = sessionStorage.getItem(storageKey);
                const now = Date.now();

                // Reload if we haven't reloaded recently (e.g., within 10 seconds)
                if (!lastReload || now - parseInt(lastReload) > 10000) {
                    // console.warn('Chunk load error detected, reloading page...');
                    sessionStorage.setItem(storageKey, now.toString());
                    window.location.reload();
                    // Return a dummy component to prevent further errors while reloading
                    return { default: () => null };
                }
            }

            // If it's not a chunk error or we just reloaded, throw the error
            throw error;
        }
    });
};
