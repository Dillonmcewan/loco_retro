import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	server: { host: true },
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/setup-tests.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,svelte}'],
			exclude: ['src/**/*.{test,spec}.{js,ts}', 'src/setup-tests.ts']
		}
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
