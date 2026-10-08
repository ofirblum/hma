import { defineConfig } from 'astro/config';

// Served at the root of the custom domain; set BASE_PATH=/hma to serve from ofirblum.github.io/hma.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL ?? 'https://highmountainsarchive.site',
  base: process.env.BASE_PATH ?? '/',
  devToolbar: { enabled: false },
  vite: {
    // A separate dev cache stops `astro check`/`build` from invalidating a running dev server's deps.
    cacheDir: process.argv.includes('dev') ? 'node_modules/.vite-dev' : 'node_modules/.vite',
    optimizeDeps: { include: ['alpinejs'] },
  },
});