import { test, expect } from '@playwright/test';
import { createRoom, joinRoom } from './helpers';

// Weaker than the planned "offline-reload": instead of cutting the sync
// WebSocket mid-test, we just verify a reload restores the room shell.
// State may come from IndexedDB, the DO, or both — either way, it doesn't
// get lost.
test('room state survives a reload', async ({ page }) => {
	await createRoom(page, { name: 'Persistence check' });
	await joinRoom(page, 'Solo');
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();

	await page.reload();

	// Display name persisted in localStorage skips the gate.
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();
});
