import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./src/setup-tests.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}']
	},
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined
});
