import { test, expect } from '@playwright/test';
import { ROOM_URL_PATTERN, createRoom, joinRoom } from './helpers';

test('a created retro appears as a tile on the dashboard', async ({ page }) => {
	await page.goto('/');

	// Empty state: only the New Retro tile + placeholder tiles, no room tiles.
	await expect(page.getByText(/your retros will appear here/i)).toBeVisible();
	await expect(page.getByRole('button', { name: /open retro/i })).toHaveCount(0);

	// Create a retro through the modal.
	await createRoom(page, { name: 'Dashboard demo', template: 'Start / Stop / Continue' });

	// Join the room — this is what makes the room route observe `meta` and
	// upsert into the sidecar index (covers the "joined via shared link" path
	// in addition to the "created" path that the modal already covered).
	await joinRoom(page, 'Alice');
	await expect(page.getByRole('heading', { name: 'Dashboard demo' })).toBeVisible();

	// Back to the dashboard — tile is present with the expected metadata.
	await page.goto('/');
	const tile = page.getByRole('button', { name: /open retro: dashboard demo/i });
	await expect(tile).toBeVisible();
	await expect(tile).toContainText('Start / Stop / Continue');
	await expect(tile).toContainText(/just now|m ago/i);

	// Clicking the tile navigates back to the room.
	await tile.click();
	await expect(page).toHaveURL(ROOM_URL_PATTERN);
	await expect(page.getByRole('heading', { name: 'Dashboard demo' })).toBeVisible();

	// Reload preserves the tile.
	await page.goto('/');
	await expect(page.getByRole('button', { name: /open retro: dashboard demo/i })).toBeVisible();
});
