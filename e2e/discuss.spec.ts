import { test, expect } from '@playwright/test';
import {
	addCardUnder,
	advancePhase,
	cardLocator,
	castVoteOn,
	columnLocator,
	createRoom,
	joinRoom,
	setupTwoClients
} from './helpers';

test('two-client Discuss: cards sort by votes and discussed toggle replicates', async ({
	browser
}) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	const roomUrl = await createRoom(pageA, {
		name: 'Discuss retro',
		template: 'Start / Stop / Continue',
		votesPerParticipant: 3
	});

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'c1');
	await addCardUnder(pageA, 'Start', 'c2');
	await addCardUnder(pageA, 'Start', 'c3');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('c1')).toBeVisible();
	await expect(pageB.getByText('c2')).toBeVisible();
	await expect(pageB.getByText('c3')).toBeVisible();

	await advancePhase(pageA, 'Vote');
	await castVoteOn(pageA, 'c2');
	await castVoteOn(pageA, 'c2');
	await castVoteOn(pageA, 'c3');
	await castVoteOn(pageB, 'c1');

	await advancePhase(pageA, 'Discuss');

	// Aggregate badges visible; no controls; no budget chip.
	await expect(pageA.getByLabel(/votes remaining/i)).toHaveCount(0);
	await expect(pageA.getByRole('button', { name: /cast a vote/i })).toHaveCount(0);

	// Sort within the Start column: c2 (2 votes), then a 1-vote tie between
	// c1 (added first) and c3 (added third) — older createdAt wins the tie.
	const startCardsA = columnLocator(pageA, 'Start').locator('article.retro-card');
	await expect(startCardsA.nth(0)).toContainText('c2');
	await expect(startCardsA.nth(1)).toContainText('c1');
	await expect(startCardsA.nth(2)).toContainText('c3');

	const startCardsB = columnLocator(pageB, 'Start').locator('article.retro-card');
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

	// Advance to Closed; discussed cards show a static indicator and the toggle
	// button is gone for both discussed and non-discussed cards.
	await advancePhase(pageA, 'Closed');
	await expect(cardLocator(pageA, 'c2').locator('.discussed-indicator')).toBeVisible();
	await expect(
		cardLocator(pageA, 'c2').getByRole('button', { name: /mark as (not )?discussed/i })
	).toHaveCount(0);
	await expect(
		cardLocator(pageB, 'c1').getByRole('button', { name: /mark as (not )?discussed/i })
	).toHaveCount(0);
	await expect(cardLocator(pageB, 'c1').locator('.discussed-indicator')).toHaveCount(0);

	await closeAll();
});
