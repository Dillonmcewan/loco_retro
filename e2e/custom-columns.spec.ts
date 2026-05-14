import { test, expect } from '@playwright/test';
import { ROOM_URL_PATTERN, joinRoom } from './helpers';

test('facilitator creates a custom-column template and reuses it', async ({ page }) => {
	await page.goto('/');

	// Open create-room modal.
	await page.getByRole('button', { name: /create a new retro/i }).click();
	await expect(page.getByRole('heading', { name: /create a retro/i })).toBeVisible();

	// Step into the picker → editor.
	await page.getByRole('button', { name: /more templates/i }).click();
	await expect(page.getByRole('heading', { name: /choose a template/i })).toBeVisible();
	await page.getByRole('button', { name: /create new template/i }).click();

	// Fill in four custom column titles (no template name).
	await page.getByLabel('Column 1 title').fill('Mind');
	await page.getByRole('button', { name: /add column/i }).click();
	await page.getByLabel('Column 2 title').fill('Body');
	await page.getByRole('button', { name: /add column/i }).click();
	await page.getByLabel('Column 3 title').fill('Soul');
	await page.getByRole('button', { name: /add column/i }).click();
	await page.getByLabel('Column 4 title').fill('Vibe');

	await page.getByRole('button', { name: /save template/i }).click();

	// Back on the main modal: fill in room name and create.
	await page.getByLabel('Room name').fill('Custom retro');
	await page.getByRole('button', { name: /^create retro/i }).click();

	// Lands on the room URL.
	await expect(page).toHaveURL(ROOM_URL_PATTERN);

	// Join the room and verify the four custom columns render.
	await joinRoom(page, 'Alice');
	for (const title of ['Mind', 'Body', 'Soul', 'Vibe']) {
		await expect(page.getByRole('heading', { name: title })).toBeVisible();
	}

	// Navigate back to the dashboard; the new tile shows the derived label.
	await page.getByRole('link', { name: /back to dashboard/i }).click();
	await expect(page.getByRole('button', { name: /open retro: custom retro/i })).toBeVisible();
	await expect(page.getByText('Mind / Body / Soul / Vibe').first()).toBeVisible();

	// Open the create modal again: the custom template now appears as a recent card.
	await page.getByRole('button', { name: /create a new retro/i }).click();
	await expect(
		page.locator('button.card-selector').filter({ hasText: /Mind \/ Body \/ Soul \/ Vibe/ })
	).toBeVisible();
});
