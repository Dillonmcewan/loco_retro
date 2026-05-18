import { describe, it, expect, vi, afterEach } from 'vitest';

// Pins the fail-fast contract: importing room.ts without VITE_SYNC_HOST
// throws at module load. The committed `.env` carries the dev default;
// deploy targets must set the var explicitly.

describe('VITE_SYNC_HOST required', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		vi.resetModules();
	});

	it('throws when the env var is missing', async () => {
		vi.stubEnv('VITE_SYNC_HOST', '');
		vi.resetModules();
		await expect(import('./room')).rejects.toThrow(/VITE_SYNC_HOST is not set/);
	});

	it('imports cleanly when the env var is set', async () => {
		vi.stubEnv('VITE_SYNC_HOST', 'localhost:1999');
		vi.resetModules();
		await expect(import('./room')).resolves.toBeDefined();
	});
});
