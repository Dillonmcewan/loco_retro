import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.spec.ts',
	webServer: [
		{
			command: 'pnpm sync:dev',
			// wrangler dev (like partykit dev before it) is WebSockets-first; the
			// HTTP root returns non-2xx, which Playwright 1.59+ treats as "not
			// ready". `port` triggers a port-bound check (`isPortUsed`), which is
			// the right readiness signal here.
			port: 1999,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		},
		{
			command: 'pnpm dev',
			url: 'http://localhost:5173',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: { VITE_SYNC_HOST: 'localhost:1999' }
		}
	],
	use: { baseURL: 'http://localhost:5173' },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]
});
