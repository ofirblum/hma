import { defineConfig } from 'astro/config';

// Served at the root of the custom domain; set BASE_PATH=/hma to serve from ofirblum.github.io/hma.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL ?? 'https://highmountainsarchive.site',
  base: process.env.BASE_PATH ?? '/',
  devToolbar: { enabled: false },
});