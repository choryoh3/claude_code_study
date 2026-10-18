import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['{apps,packages,scripts,.claude}/**/*.test.{ts,tsx,mjs}'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**', '.claude/worktrees/**'],
    passWithNoTests: true,
  },
});
