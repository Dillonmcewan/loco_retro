import { test, expect } from '@playwright/test';
import { addCardUnder, createRoom, joinRoom } from './helpers';

// Proves the late-joiner-bootstrap claim: a fresh client can rehydrate
// from the sync Worker Durable Object even after the original creator has
// closed their tab entirely. This is the specific guarantee that the
// previous y-webrtc attempt couldn't deliver.

test('late joiner bootstraps from the DO after creator leaves', async ({ browser }) => {
	// A: create the room with a card, then close the context entirely.
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();

	const roomUrl = await createRoom(pageA, {
		name: 'Bootstrap retro',
		template: 'Start / Stop / Continue'
	});

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
