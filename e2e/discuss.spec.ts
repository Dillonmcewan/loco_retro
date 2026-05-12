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

function cardLocator(page: Page, text: string) {
	return page.locator('article.card', { hasText: text });
}

async function castOn(page: Page, cardText: string) {
	await cardLocator(page, cardText)
		.getByRole('button', { name: /cast a vote/i })
		.click();
}

test('two-client Discuss: cards sort by votes and discussed toggle replicates', async ({
	browser
}) => {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();

	await pageA.goto('/');
	await pageA.getByRole('button', { name: /create a new retro/i }).click();
	await pageA.getByLabel('Room name').fill('Discuss retro');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByLabel('Votes per participant').fill('3');
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'c1');
	await addCardUnder(pageA, 'Start', 'c2');
	await addCardUnder(pageA, 'Start', 'c3');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('c1')).toBeVisible();
	await expect(pageB.getByText('c2')).toBeVisible();
	await expect(pageB.getByText('c3')).toBeVisible();

	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await castOn(pageA, 'c2');
	await castOn(pageA, 'c2');
	await castOn(pageA, 'c3');
	await castOn(pageB, 'c1');

	await pageA.getByRole('button', { name: 'Advance: Discuss' }).click();

	// Aggregate badges visible; no controls; no budget chip.
	await expect(pageA.getByLabel(/votes remaining/i)).toHaveCount(0);
	await expect(pageA.getByRole('button', { name: /cast a vote/i })).toHaveCount(0);

	// Sort within the Start column: c2 (2 votes), then a 1-vote tie between
	// c1 (added first) and c3 (added third) — older createdAt wins the tie.
	const startCardsA = pageA.locator('article.column', { hasText: 'Start' }).locator('article.card');
	await expect(startCardsA.nth(0)).toContainText('c2');
	await expect(startCardsA.nth(1)).toContainText('c1');
	await expect(startCardsA.nth(2)).toContainText('c3');

	const startCardsB = pageB.locator('article.column', { hasText: 'Start' }).locator('article.card');
	await expect(startCardsB.nth(0)).toContainText('c2');
	await expect(startCardsB.nth(1)).toContainText('c1');
	await expect(startCardsB.nth(2)).toContainText('c3');

	// A marks c2 as discussed; B sees the discussed class hook on c2.
	await cardLocator(pageA, 'c2')
		.getByRole('button', { name: /mark as discussed/i })
		.click();
	await expect(cardLocator(pageA, 'c2')).toHaveClass(/discussed/);
	await expect(cardLocator(pageB, 'c2')).toHaveClass(/discussed/);
	await expect(
		cardLocator(pageB, 'c2').getByRole('button', { name: /mark as not discussed/i })
	).toBeVisible();

	// Advance to Closed; toggles are still rendered but disabled in both browsers.
	await pageA.getByRole('button', { name: 'Advance: Closed' }).click();
	await expect(
		cardLocator(pageA, 'c2').getByRole('button', { name: /mark as not discussed/i })
	).toBeDisabled();
	await expect(
		cardLocator(pageB, 'c1').getByRole('button', { name: /mark as discussed/i })
	).toBeDisabled();

	await ctxA.close();
	await ctxB.close();
});
