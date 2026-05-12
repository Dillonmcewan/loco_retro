import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.spec.ts',
	webServer: [
		{
			command: 'pnpm party:dev',
			// PartyKit serves WebSockets only — its HTTP root returns 404, which
			// Playwright 1.59+ treats as "not ready" (its URL probe accepts only
			// 2xx–3xx). `port` triggers a port-bound check (`isPortUsed`), which
			// is the right readiness signal for a WS-only server.
			port: 1999,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		},
		{
			command: 'pnpm dev',
			url: 'http://localhost:5173',
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: { VITE_PARTYKIT_HOST: 'localhost:1999' }
		}
	],
	use: { baseURL: 'http://localhost:5173' },
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]
});
