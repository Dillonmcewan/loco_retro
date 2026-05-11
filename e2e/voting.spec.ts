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
	await cardLocator(page, cardText).getByRole('button', { name: /cast a vote/i }).click();
}

async function retractOn(page: Page, cardText: string) {
	await cardLocator(page, cardText).getByRole('button', { name: /retract a vote/i }).click();
}

test('two-client dot voting flow with reclamation on delete', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();

	// Client A creates a room with a 3-vote budget and the Start/Stop/Continue
	// preset.
	await pageA.goto('/');
	await pageA.getByLabel('Room name').fill('Voting retro');
	await pageA.getByText('Start / Stop / Continue').click();
	const votes = pageA.getByLabel('Votes per participant');
	await votes.fill('3');
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'pair more often');
	await addCardUnder(pageA, 'Stop', 'late standups');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('pair more often')).toBeVisible();
	await expect(pageB.getByText('late standups')).toBeVisible();

	// A advances to Vote. B sees the budget chip too.
	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await expect(pageA.getByLabel(/votes remaining/i)).toContainText('3 / 3');
	await expect(pageB.getByLabel(/votes remaining/i)).toContainText('3 / 3');

	// No aggregate badges during Vote.
	await expect(pageA.getByLabel(/total votes/i)).toHaveCount(0);
	await expect(pageB.getByLabel(/total votes/i)).toHaveCount(0);

	// A casts 2 on "pair more often", 1 on "late standups".
	await castOn(pageA, 'pair more often');
	await castOn(pageA, 'pair more often');
	await castOn(pageA, 'late standups');
	await expect(pageA.getByLabel(/votes remaining/i)).toContainText('0 / 3');

	// A's + buttons are now disabled (budget spent).
	for (const text of ['pair more often', 'late standups']) {
		await expect(cardLocator(pageA, text).getByRole('button', { name: /cast a vote/i })).toBeDisabled();
	}

	// B casts 3 on "late standups".
	await castOn(pageB, 'late standups');
	await castOn(pageB, 'late standups');
	await castOn(pageB, 'late standups');
	await expect(pageB.getByLabel(/votes remaining/i)).toContainText('0 / 3');

	// A retracts one from "late standups" and re-allocates to "pair more often".
	await retractOn(pageA, 'late standups');
	await castOn(pageA, 'pair more often');

	// Advance to Discuss. Controls + budget chip disappear on both sides.
	await pageA.getByRole('button', { name: 'Advance: Discuss' }).click();
	await expect(pageA.getByLabel(/votes remaining/i)).toHaveCount(0);
	await expect(pageB.getByLabel(/votes remaining/i)).toHaveCount(0);
	await expect(pageA.getByRole('button', { name: /cast a vote/i })).toHaveCount(0);
	await expect(pageB.getByRole('button', { name: /cast a vote/i })).toHaveCount(0);

	// Aggregate badges agree across clients: pair=3, late=3.
	const pairBadgeA = cardLocator(pageA, 'pair more often').getByLabel(/total votes/i);
	const lateBadgeA = cardLocator(pageA, 'late standups').getByLabel(/total votes/i);
	await expect(pairBadgeA).toHaveText(/Votes:\s*3/);
	await expect(lateBadgeA).toHaveText(/Votes:\s*3/);
	const pairBadgeB = cardLocator(pageB, 'pair more often').getByLabel(/total votes/i);
	const lateBadgeB = cardLocator(pageB, 'late standups').getByLabel(/total votes/i);
	await expect(pairBadgeB).toHaveText(/Votes:\s*3/);
	await expect(lateBadgeB).toHaveText(/Votes:\s*3/);

	await ctxA.close();
	await ctxB.close();
});

test('deleting a voted card refunds the budget on the next Vote phase', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();

	await pageA.goto('/');
	await pageA.getByLabel('Room name').fill('Reclaim retro');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByLabel('Votes per participant').fill('3');
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'card one');
	await addCardUnder(pageA, 'Start', 'card two');

	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await castOn(pageA, 'card one');
	await castOn(pageA, 'card one');
	await expect(pageA.getByLabel(/votes remaining/i)).toContainText('1 / 3');

	// Step back to Collect and delete card one — votes should refund.
	await pageA.getByRole('button', { name: 'Go back: Collect' }).click();
	await cardLocator(pageA, 'card one').getByRole('button', { name: /delete card/i }).click();
	await expect(pageA.getByText('card one')).toHaveCount(0);

	await pageA.getByRole('button', { name: 'Advance: Vote' }).click();
	await expect(pageA.getByLabel(/votes remaining/i)).toContainText('3 / 3');

	await ctxA.close();
});
