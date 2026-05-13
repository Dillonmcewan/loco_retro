import { test, expect, type Page } from '@playwright/test';

// Proves the late-joiner-bootstrap claim: a fresh client can rehydrate
// from the PartyKit Durable Object even after the original creator has
// closed their tab entirely. This is the specific guarantee that the
// previous y-webrtc attempt couldn't deliver.

async function joinRoom(page: Page, name: string) {
	await page.getByLabel('Display name').fill(name);
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('heading', { name: /retro/i }).first()).toBeVisible();
}

async function addCardUnder(page: Page, columnTitle: string, text: string) {
	const column = page
		.locator('article.column')
		.filter({ has: page.getByRole('heading', { name: columnTitle, exact: true }) });
	await column.getByLabel('New card text').fill(text);
	await column.getByRole('button', { name: /add/i }).click();
}

test('late joiner bootstraps from the DO after creator leaves', async ({ browser }) => {
	// A: create the room with a card, then close the context entirely.
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();

	await pageA.goto('/');
	await pageA.getByRole('button', { name: /create a new retro/i }).click();
	await pageA.getByLabel('Room name').fill('Bootstrap retro');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'bootstrap me');
	await expect(pageA.getByText('bootstrap me')).toBeVisible();

	// Tear A down completely — no IndexedDB carryover, no active peer.
	await ctxA.close();

	// B is a *fresh* context with no prior storage. It must rehydrate
	// the room solely from the Durable Object.
	const ctxB = await browser.newContext();
	const pageB = await ctxB.newPage();
	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');

	await expect(pageB.getByRole('heading', { name: 'Bootstrap retro' })).toBeVisible();
	await expect(pageB.getByRole('heading', { name: 'Start' })).toBeVisible();
	await expect(pageB.getByText('bootstrap me')).toBeVisible();

	await ctxB.close();
});
