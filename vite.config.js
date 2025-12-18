import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inline-css',
      enforce: 'post',
      transformIndexHtml(html, ctx) {
        if (!ctx.bundle) return html;

        const cssFile = Object.values(ctx.bundle).find(
          (chunk) => chunk.fileName.endsWith('.css')
        );

        if (!cssFile) return html;

        const cssCode = cssFile.source;

        // Remove the link tag
        const htmlWithoutLink = html.replace(
          /<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css"[^>]*>/,
          ''
        );

        // Inject style tag
        return htmlWithoutLink.replace(
          '</head>',
          `<style>${cssCode}</style></head>`
        );
      },
      // Also remove the css file from the bundle so it's not emitted
      generateBundle(options, bundle) {
        const cssFileName = Object.keys(bundle).find(key => key.endsWith('.css'));
        if (cssFileName) {
          delete bundle[cssFileName];
        }
      }
    },
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
  },
});
