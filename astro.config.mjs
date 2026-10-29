// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // The live address. Share previews need absolute URLs, so they're built from this.
  site: 'https://unlisted.icarianforge.com',
  // Styles go inside each page instead of separate files, so nothing blocks the first paint on a slow phone
  build: { inlineStylesheets: 'always' },
});
