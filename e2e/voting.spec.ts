import { test, expect } from '@playwright/test';
import {
	addCardUnder,
	advancePhase,
	cardLocator,
	castVoteOn,
	createRoom,
	goBackToPhase,
	joinRoom,
	retractVoteOn,
	setupTwoClients
} from './helpers';

test('two-client dot voting flow with reclamation on delete', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	// Client A creates a room with a 3-vote budget and the Start/Stop/Continue
	// preset.
	const roomUrl = await createRoom(pageA, {
		name: 'Voting retro',
		template: 'Start / Stop / Continue',
		votesPerParticipant: 3
	});

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'pair more often');
	await addCardUnder(pageA, 'Stop', 'late standups');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('pair more often')).toBeVisible();
	await expect(pageB.getByText('late standups')).toBeVisible();

	// A advances to Vote. B sees the budget chip too.
	await advancePhase(pageA, 'Vote');
	await expect(pageA.locator('.budget')).toContainText('3 / 3');
	await expect(pageB.locator('.budget')).toContainText('3 / 3');

	// No aggregate badges during Vote.
	await expect(pageA.getByLabel(/total votes/i)).toHaveCount(0);
	await expect(pageB.getByLabel(/total votes/i)).toHaveCount(0);

	// A casts 2 on "pair more often", 1 on "late standups".
	await castVoteOn(pageA, 'pair more often');
	await castVoteOn(pageA, 'pair more often');
	await castVoteOn(pageA, 'late standups');
	await expect(pageA.locator('.budget')).toContainText(/Done voting!/i);

	// A's + buttons are now disabled (budget spent).
	for (const text of ['pair more often', 'late standups']) {
		await expect(
			cardLocator(pageA, text).getByRole('button', { name: /cast a vote/i })
		).toBeDisabled();
	}

	// B casts 3 on "late standups".
	await castVoteOn(pageB, 'late standups');
	await castVoteOn(pageB, 'late standups');
	await castVoteOn(pageB, 'late standups');
	await expect(pageB.locator('.budget')).toContainText(/Done voting!/i);

	// A retracts one from "late standups" and re-allocates to "pair more often".
	await retractVoteOn(pageA, 'late standups');
	await castVoteOn(pageA, 'pair more often');

	// Advance to Discuss. Controls + budget chip disappear on both sides.
	await advancePhase(pageA, 'Discuss');
	await expect(pageA.locator('.budget')).toHaveCount(0);
	await expect(pageB.locator('.budget')).toHaveCount(0);
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

	await closeAll();
});

test('Chris mode: no budget cap, chip toggles manual "done voting"', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);

	// Client A creates a Chris-mode retro. Walk through the modal manually here
	// so we can assert the votes-input disable behavior toggles with the
	// checkbox before submitting.
	await pageA.goto('/');
	await pageA.getByRole('button', { name: /create a new retro/i }).click();
	await pageA.getByLabel('Room name').fill('Chris mode retro');
	await pageA.getByText('Start / Stop / Continue').click();

	const votesInput = pageA.getByLabel('Votes per participant');
	await expect(votesInput).toBeEnabled();
	const chrisToggle = pageA.getByLabel(/chris mode/i);
	await expect(chrisToggle).not.toBeChecked();
	await chrisToggle.check();
	await expect(chrisToggle).toBeChecked();
	await expect(votesInput).toBeDisabled();

	await pageA.getByRole('button', { name: /create retro/i }).click();
	await expect(pageA).toHaveURL(/\/r\/[0-9a-f-]{36}$/i);
	const roomUrl = pageA.url();

	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'unlimited vibes');

	await pageB.goto(roomUrl);
	await joinRoom(pageB, 'Bob');
	await expect(pageB.getByText('unlimited vibes')).toBeVisible();

	await advancePhase(pageA, 'Vote');
	// Budget chip is interactive, shows "I'm done" affordance (no X / N count).
	const chipA = pageA.locator('.budget');
	const chipB = pageB.locator('.budget');
	await expect(chipA).toContainText(/I'm done/i);
	await expect(chipA).not.toContainText(/\d+ \/ \d+/);

	// Cast far more votes than any nominal budget would allow.
	for (let i = 0; i < 10; i++) {
		await castVoteOn(pageA, 'unlimited vibes');
	}
	// Cast button stays enabled — no auto "Done voting!".
	await expect(
		cardLocator(pageA, 'unlimited vibes').getByRole('button', { name: /cast a vote/i })
	).toBeEnabled();
	await expect(chipA).not.toContainText(/Done voting!/i);

	// A manually marks done via the chip; chip flips state, B sees it via the
	// participant ready indicator (Advance button glow is the canonical signal
	// — we just verify the chip toggle is operative).
	await chipA.click();
	await expect(chipA).toContainText(/Done voting!/i);
	await expect(chipA).toHaveAttribute('aria-pressed', 'true');
	await expect(chipA).toHaveAttribute('aria-label', /mark voting incomplete/i);

	// B is still not done — only one click required from each side to reach
	// everyone-done. Bob marks himself done too.
	await expect(chipB).toContainText(/I'm done/i);
	await chipB.click();
	await expect(chipB).toContainText(/Done voting!/i);

	// Click chip again on A: un-marks.
	await chipA.click();
	await expect(chipA).toContainText(/I'm done/i);
	await expect(chipA).toHaveAttribute('aria-pressed', 'false');
	await expect(chipA).toHaveAttribute('aria-label', /mark voting complete/i);

	await closeAll();
});

test('deleting a voted card refunds the budget on the next Vote phase', async ({ browser }) => {
	const ctxA = await browser.newContext();
	const pageA = await ctxA.newPage();

	await createRoom(pageA, {
		name: 'Reclaim retro',
		template: 'Start / Stop / Continue',
		votesPerParticipant: 3
	});
	await joinRoom(pageA, 'Alice');
	await addCardUnder(pageA, 'Start', 'card one');
	await addCardUnder(pageA, 'Start', 'card two');

	await advancePhase(pageA, 'Vote');
	await castVoteOn(pageA, 'card one');
	await castVoteOn(pageA, 'card one');
	await expect(pageA.locator('.budget')).toContainText('1 / 3');

	// Step back to Collect and delete card one — votes should refund.
	await goBackToPhase(pageA, 'Collect');
	await cardLocator(pageA, 'card one')
		.getByRole('button', { name: /delete card/i })
		.click();
	await expect(pageA.getByText('card one')).toHaveCount(0);

	await advancePhase(pageA, 'Vote');
	await expect(pageA.locator('.budget')).toContainText('3 / 3');

	await ctxA.close();
});
