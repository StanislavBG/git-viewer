import { defineConfig } from '@playwright/test';

// Golden gate: build a self-contained preview (incl. data.json) into a throwaway
// dir so it stays independent of the publish dist/ (which is stripped of
// data.json for the bilko.run mirror). localhost is a canonical host, so the
// loader reads the bundled data.json.
export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command:
      'pnpm exec vite build --outDir .pw-dist && pnpm exec vite preview --outDir .pw-dist --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
