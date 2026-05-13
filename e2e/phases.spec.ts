import { test, expect } from '@playwright/test';
import {
	addCardUnder,
	advancePhase,
	cardLocator,
	createRoom,
	goBackToPhase,
	joinRoom,
	setupTwoClients
} from './helpers';

test('phase advances sync across two clients and gate card mutations', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	const roomUrl = await createRoom(pageA, {
		name: 'Phases retro',
		template: 'Start / Stop / Continue'
	});

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
	await advancePhase(pageA, 'Vote');
	await expect(pageA.getByLabel(/current phase/i)).toContainText('Vote');
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Vote');
	await expect(pageB.getByLabel('New card text')).toHaveCount(0);
	await expect(pageA.getByLabel('New card text')).toHaveCount(0);

	// In Vote, even the author sees no edit/delete affordances.
	const aliceCardA = cardLocator(pageA, 'pair more often');
	await expect(aliceCardA.getByRole('button', { name: /edit card/i })).toHaveCount(0);
	await expect(aliceCardA.getByRole('button', { name: /delete card/i })).toHaveCount(0);

	// Step back to Collect — affordances and form return on both sides.
	await goBackToPhase(pageA, 'Collect');
	await expect(pageB.getByLabel(/current phase/i)).toContainText('Collect');
	await expect(pageB.getByLabel('New card text').first()).toBeVisible();
	await expect(aliceCardA.getByRole('button', { name: /edit card/i })).toHaveCount(1);

	// Walk all the way to Closed.
	await advancePhase(pageA, 'Vote');
	await advancePhase(pageA, 'Discuss');
	await advancePhase(pageA, 'Closed');

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

	await closeAll();
});
