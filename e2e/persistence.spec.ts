import { test, expect } from '@playwright/test';

// Weaker than the planned "offline-reload" — Playwright 1.47 doesn't ship
// page.routeWebSocket, so we can't cleanly disable the relay mid-test. This
// still verifies that a reload restores the room shell (state comes from
// IndexedDB, the relay, or both — either way: it doesn't get lost).
test('room state survives a reload', async ({ page }) => {
	await page.goto('/create');
	await page.getByLabel('Room name').fill('Persistence check');
	await page.getByRole('button', { name: /create retro/i }).click();
	await expect(page).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);

	await page.getByLabel('Display name').fill('Solo');
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();

	await page.reload();

	// Display name persisted in localStorage skips the gate.
	await expect(page.getByRole('heading', { name: 'Persistence check' })).toBeVisible();
});
