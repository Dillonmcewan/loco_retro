import { test, expect } from '@playwright/test';

test('two clients can create and join the same room', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();

	// A: create the room with the Start/Stop/Continue template.
	await pageA.goto('/');
	await pageA.getByLabel('Room name').fill('Sprint 42');
	await pageA.getByText('Start / Stop / Continue').click();
	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	// A: name themselves.
	await pageA.getByLabel('Display name').fill('Alice');
	await pageA.getByRole('button', { name: 'Join' }).click();

	// A sees the room shell.
	await expect(pageA.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Start' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Stop' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Continue' })).toBeVisible();

	// B opens the same URL — gate appears (separate context = separate localStorage).
	await pageB.goto(roomUrl);
	await pageB.getByLabel('Display name').fill('Bob');
	await pageB.getByRole('button', { name: 'Join' }).click();

	// B sees the same room name + columns synced via the relay.
	await expect(pageB.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
	await expect(pageB.getByRole('heading', { name: 'Start' })).toBeVisible();

	// Both clients eventually see both participants via Yjs awareness.
	const participantsA = pageA.getByRole('region', { name: 'Participants' });
	const participantsB = pageB.getByRole('region', { name: 'Participants' });
	await expect(participantsA).toContainText('Alice');
	await expect(participantsA).toContainText('Bob');
	await expect(participantsB).toContainText('Alice');
	await expect(participantsB).toContainText('Bob');

	await ctxA.close();
	await ctxB.close();
});
