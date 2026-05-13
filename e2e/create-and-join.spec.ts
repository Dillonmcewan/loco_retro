import { test, expect } from '@playwright/test';
import { createRoom, joinRoom, setupTwoClients } from './helpers';

test('two clients can create and join the same room', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	// A: create the room with the Start/Stop/Continue template.
	const roomUrl = await createRoom(pageA, {
		name: 'Sprint 42',
		template: 'Start / Stop / Continue'
	});

	// A: name themselves.
	await joinRoom(pageA, 'Alice');

	// A sees the room shell.
	await expect(pageA.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Start' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Stop' })).toBeVisible();
	await expect(pageA.getByRole('heading', { name: 'Continue' })).toBeVisible();

	// B opens the same URL — gate appears (separate context = separate localStorage).
	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');

	// B sees the same room name + columns synced via the PartyKit DO.
	await expect(pageB.getByRole('heading', { name: 'Sprint 42' })).toBeVisible();
	await expect(pageB.getByRole('heading', { name: 'Start' })).toBeVisible();

	// Both clients eventually see both participants via Yjs awareness.
	const participantsA = pageA.getByRole('list', { name: 'Participants' });
	const participantsB = pageB.getByRole('list', { name: 'Participants' });
	await expect(participantsA).toContainText('Alice');
	await expect(participantsA).toContainText('Bob');
	await expect(participantsB).toContainText('Alice');
	await expect(participantsB).toContainText('Bob');

	await closeAll();
});
