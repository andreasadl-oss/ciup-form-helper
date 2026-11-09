import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works under a GitHub Pages project subpath.
  base: './',
  test: {
    environment: 'jsdom',
    // Agent worktrees live inside the repo; don't run their copies of the tests.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
