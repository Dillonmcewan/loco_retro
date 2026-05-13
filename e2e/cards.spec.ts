import { test, expect } from '@playwright/test';
import { addCardUnder, cardLocator, createRoom, joinRoom, setupTwoClients } from './helpers';

test('two clients can add, edit, and delete cards with ownership gating', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	// A: create the room.
	const roomUrl = await createRoom(pageA, {
		name: 'Cards retro',
		template: 'Start / Stop / Continue'
	});

	await joinRoom(pageA, 'Alice');

	// A adds a card under "Start".
	await addCardUnder(pageA, 'Start', 'pair more often');
	await expect(pageA.getByText('pair more often')).toBeVisible();

	// B opens the URL, joins, sees A's card with A's name.
	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	const aliceCard = cardLocator(pageB, 'pair more often');
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
	await cardLocator(pageA, 'pair more often')
		.getByRole('button', { name: /edit card/i })
		.click();
	const editor = pageA.getByRole('textbox', { name: /edit card/i });
	await editor.fill('pair more often (every PR)');
	await pageA.getByRole('button', { name: /save changes/i }).click();
	await expect(pageB.getByText('pair more often (every PR)')).toBeVisible();

	// A deletes their card; B sees it disappear.
	await cardLocator(pageA, 'pair more often (every PR)')
		.getByRole('button', { name: /delete card/i })
		.click();
	await expect(pageB.getByText('pair more often (every PR)')).toHaveCount(0);

	// Bob's card is still there.
	await expect(pageB.getByText('demo days')).toBeVisible();
	await expect(pageA.getByText('demo days')).toBeVisible();

	await closeAll();
});
