import { test, expect, type Page } from '@playwright/test';
import { addCardUnder, advancePhase, createRoom, joinRoom } from './helpers';

async function seedAndAdvanceToClosed(page: Page): Promise<string> {
	const url = await createRoom(page, {
		name: 'Closed CTA test',
		template: 'Start / Stop / Continue'
	});
	await joinRoom(page, 'Alice');
	await addCardUnder(page, 'Start', 'celebrate wins');
	await advancePhase(page, 'Vote');
	await advancePhase(page, 'Discuss');
	await advancePhase(page, 'Closed');
	return url;
}

async function dismissCelebrationAndWaitForCTA(page: Page) {
	// Skip the 6.5s show by clicking the celebration backdrop, then wait for the
	// CTA dialog to appear.
	await page.getByRole('button', { name: /dismiss celebration/i }).click();
	await expect(page.getByRole('dialog', { name: /nice retro/i })).toBeVisible();
}

test('live transition to Closed shows the CTA, and Export opens the export modal', async ({
	page
}) => {
	await seedAndAdvanceToClosed(page);
	await dismissCelebrationAndWaitForCTA(page);

	const cta = page.getByRole('dialog', { name: /nice retro/i });
	await expect(cta.getByRole('button', { name: /export retro/i })).toBeVisible();
	await expect(cta.getByRole('button', { name: /back to dashboard/i })).toBeVisible();

	await cta.getByRole('button', { name: /export retro/i }).click();
	await expect(cta).toBeHidden();
	await expect(page.getByRole('heading', { name: 'Export retro' })).toBeVisible();
	await expect(page.getByRole('button', { name: /^PDF/ })).toBeVisible();
});

test('reload into an already-closed room does NOT show the CTA', async ({ page }) => {
	const url = await seedAndAdvanceToClosed(page);
	// Dismiss the live celebration + CTA so they don't pollute the next assertion.
	await dismissCelebrationAndWaitForCTA(page);
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: /nice retro/i })).toBeHidden();

	await page.goto(url);
	// Wait until the room UI is hydrated.
	await expect(page.getByLabel(/current phase/i)).toContainText('Closed');
	// No celebration, no CTA — mount-into-closed is gated.
	await expect(page.getByRole('button', { name: /dismiss celebration/i })).toHaveCount(0);
	await expect(page.getByRole('dialog', { name: /nice retro/i })).toBeHidden();
});

test('ESC dismisses the CTA and leaves the board interactable', async ({ page }) => {
	await seedAndAdvanceToClosed(page);
	await dismissCelebrationAndWaitForCTA(page);

	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: /nice retro/i })).toBeHidden();

	// Read-only board still works: the card is visible and clickable area is free.
	await expect(page.getByText('celebrate wins')).toBeVisible();
});
