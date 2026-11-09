import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works under a GitHub Pages project subpath.
  base: './',
  test: {
    environment: 'jsdom',
  },
});
