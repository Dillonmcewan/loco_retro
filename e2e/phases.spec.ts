import { test, expect, type Page } from '@playwright/test';

async function joinRoom(page: Page, name: string) {
	await page.getByLabel('Display name').fill(name);
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('heading', { name: /retro/i }).first()).toBeVisible();
}

async function addCardUnder(page: Page, columnTitle: string, text: string) {
	const column = page.locator('article.column', { hasText: columnTitle });
	await column.getByLabel('New card text').fill(text);
	await column.getByRole('button', { name: /add/i }).click();
}

test('phase advances sync across two clients and gate card mutations', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();

	await pageA.goto('/');
	await pageA.getByLabel('Room name').fill('Phases retro');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'pair more often');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('pair more often')).toBeVisible();

	// Both start in Collect with a usable card form.
	await expect(pageA.getByLabel(/current phase/i)).toContainText('Collect');
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Collect');
	await expect(pageB.getByLabel('New card text').first()).toBeVisible();

	// A advances to Vote; B sees the change and the form vanishes for them too.
	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await expect(pageA.getByLabel(/current phase/i)).toContainText('Vote');
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Vote');
	await expect(pageB.getByLabel('New card text')).toHaveCount(0);
	await expect(pageA.getByLabel('New card text')).toHaveCount(0);

	// In Vote, even the author sees no edit/delete affordances.
	const aliceCardA = pageA.locator('article.card', { hasText: 'pair more often' });
	await expect(aliceCardA.getByRole('button', { name: /edit card/i })).toHaveCount(0);
	await expect(aliceCardA.getByRole('button', { name: /delete card/i })).toHaveCount(0);

	// Step back to Collect — affordances and form return on both sides.
	await pageA.getByRole('button', { name: 'Go back: Collect' }).click();
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Collect');
	await expect(pageB.getByLabel('New card text').first()).toBeVisible();
	await expect(aliceCardA.getByRole('button', { name: /edit card/i })).toHaveCount(1);

	// Walk all the way to Closed.
	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await pageA.getByRole('button', { name: 'Advance: Discuss' }).click();
	await pageA.getByRole('button', { name: 'Advance: Closed' }).click();

	await expect(pageA.getByLabel(/current phase/i)).toContainText('Closed');
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Closed');

	// Closed: advance is disabled (kept for layout stability), no card form,
	// no edit/delete on either side.
	await expect(pageA.getByRole('button', { name: 'Advance: Closed' })).toBeDisabled();
	await expect(pageB.getByLabel('New card text')).toHaveCount(0);
	await expect(pageB.getByRole('button', { name: /edit card/i })).toHaveCount(0);
	await expect(pageB.getByRole('button', { name: /delete card/i })).toHaveCount(0);

	// Card content is still visible (read-only, not deleted).
	await expect(pageB.getByText('pair more often')).toBeVisible();

	await ctxA.close();
	await ctxB.close();
});
