import { test, expect } from '@playwright/test';
import { createRoom, joinRoom } from './helpers';

// Weaker than the planned "offline-reload" — Playwright 1.47 doesn't ship
// page.routeWebSocket, so we can't cleanly disable the PartyKit WebSocket
// mid-test. This still verifies that a reload restores the room shell
// (state comes from IndexedDB, the DO, or both — either way: it doesn't
// get lost).
test('room state survives a reload', async ({ page }) => {
	await createRoom(page, { name: 'Persistence check' });
	await joinRoom(page, 'Solo');
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();

	await page.reload();

	// Display name persisted in localStorage skips the gate.
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();
});
