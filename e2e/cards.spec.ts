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

test('two clients can add, edit, and delete cards with ownership gating', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();

	// A: create the room.
	await pageA.goto('/');
	await pageA.getByLabel('Room name').fill('Cards retro');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');

	// A adds a card under "Start".
	await addCardUnder(pageA, 'Start', 'pair more often');
	await expect(pageA.getByText('pair more often')).toBeVisible();

	// B opens the URL, joins, sees A's card with A's name.
	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	const aliceCard = pageB.locator('article.card', { hasText: 'pair more often' });
	await expect(aliceCard).toBeVisible();
	await expect(aliceCard).toContainText('Alice');

	// B has no edit/delete on A's card.
	await expect(aliceCard.getByRole('button', { name: /edit card/i })).toHaveCount(0);
	await expect(aliceCard.getByRole('button', { name: /delete card/i })).toHaveCount(0);

	// B adds their own card; A sees it.
	await addCardUnder(pageB, 'Start', 'demo days');
	await expect(pageA.getByText('demo days')).toBeVisible();

	// A edits their own card; B sees the update.
	// Re-locate before each step — clicking Edit replaces the text node with a
	// textarea, so a hasText locator captured beforehand would stop matching.
	await pageA
		.locator('article.card', { hasText: 'pair more often' })
		.getByRole('button', { name: /edit card/i })
		.click();
	const editor = pageA.getByRole('textbox', { name: /edit card/i });
	await editor.fill('pair more often (every PR)');
	await pageA.getByRole('button', { name: /^save$/i }).click();
	await expect(pageB.getByText('pair more often (every PR)')).toBeVisible();

	// A deletes their card; B sees it disappear.
	await pageA
		.locator('article.card', { hasText: 'pair more often (every PR)' })
		.getByRole('button', { name: /delete card/i })
		.click();
	await expect(pageB.getByText('pair more often (every PR)')).toHaveCount(0);

	// Bob's card is still there.
	await expect(pageB.getByText('demo days')).toBeVisible();
	await expect(pageA.getByText('demo days')).toBeVisible();

	await ctxA.close();
	await ctxB.close();
});
