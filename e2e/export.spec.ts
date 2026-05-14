import { test, expect, type Page } from '@playwright/test';
import {
	addCardUnder,
	advancePhase,
	cardLocator,
	castVoteOn,
	createRoom,
	joinRoom,
	setupTwoClients
} from './helpers';

async function openExportModal(page: Page) {
	await page.getByRole('button', { name: 'Export retro' }).click();
	await expect(page.getByRole('heading', { name: 'Export retro' })).toBeVisible();
}

async function chooseAndConfirm(page: Page, format: 'PDF' | 'CSV' | 'Markdown') {
	await page.getByRole('button', { name: new RegExp(`^${format}`) }).click();
	await page.getByRole('button', { name: /^Export$/ }).click();
}

async function seedRetro(page: Page) {
	const url = await createRoom(page, {
		name: 'Sprint Export Test',
		template: 'Start / Stop / Continue'
	});
	await joinRoom(page, 'Alice');
	await addCardUnder(page, 'Start', 'do a stand up');
	await addCardUnder(page, 'Start', 'plan the sprint');
	await addCardUnder(page, 'Stop', 'side quests');
	await addCardUnder(page, 'Continue', 'pair programming');
	await advancePhase(page, 'Vote');
	await castVoteOn(page, 'do a stand up');
	await castVoteOn(page, 'side quests');
	await castVoteOn(page, 'side quests');
	await advancePhase(page, 'Discuss');
	await cardLocator(page, 'side quests')
		.getByRole('button', { name: /mark as discussed/i })
		.click();
	return url;
}

test('CSV export downloads with the expected filename and content', async ({ page }) => {
	await seedRetro(page);

	await openExportModal(page);
	const downloadPromise = page.waitForEvent('download');
	await chooseAndConfirm(page, 'CSV');
	const download = await downloadPromise;

	expect(download.suggestedFilename()).toMatch(/^sprint-export-test-\d{4}-\d{2}-\d{2}\.csv$/);

	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const c of stream) chunks.push(c as Buffer);
	const csv = Buffer.concat(chunks).toString('utf-8');
	const lines = csv.trim().split('\n');
	expect(lines[0]).toBe('Column,Card,Author,Votes,Discussed,Created At,Edited At');
	// None of the seeded values contain commas/quotes, so a plain split is
	// sufficient to assert column count and catch accidental column drift.
	expect(lines[0].split(',').length).toBe(7);
	expect(lines[1].split(',').length).toBe(7);
	expect(csv).toContain('side quests');
	expect(csv).toMatch(/side quests,Alice,2,yes,/);
	expect(csv).toMatch(/do a stand up,Alice,1,,/);
});

test('Markdown export downloads with H1 and bullet lines', async ({ page }) => {
	await seedRetro(page);

	await openExportModal(page);
	const downloadPromise = page.waitForEvent('download');
	await chooseAndConfirm(page, 'Markdown');
	const download = await downloadPromise;

	expect(download.suggestedFilename()).toMatch(/^sprint-export-test-\d{4}-\d{2}-\d{2}\.md$/);

	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const c of stream) chunks.push(c as Buffer);
	const md = Buffer.concat(chunks).toString('utf-8');
	expect(md).toMatch(/^# Sprint Export Test/);
	expect(md).toContain('### Start');
	expect(md).toContain('- do a stand up — _Alice_');
	expect(md).toContain('✓ discussed');
});

test('PDF export opens a new tab at the print route with rendered content', async ({
	context,
	page
}) => {
	// Suppress window.print on any newly-opened page so the dialog can't block.
	await context.addInitScript(() => {
		window.print = () => {};
	});

	await seedRetro(page);

	await openExportModal(page);
	const popupPromise = context.waitForEvent('page');
	await chooseAndConfirm(page, 'PDF');
	const popup = await popupPromise;
	await popup.waitForLoadState('domcontentloaded');

	await expect(popup).toHaveURL(/\/r\/[0-9a-f-]{36}\/export\/print/i);
	await expect(popup.getByRole('heading', { level: 1, name: 'Sprint Export Test' })).toBeVisible();
	await expect(popup.getByRole('heading', { name: 'Start' })).toBeVisible();
	await expect(popup.getByText('do a stand up')).toBeVisible();
});

test('any participant (not just facilitator) can export', async ({ browser }) => {
	const { pageA, pageB, closeAll } = await setupTwoClients(browser);
	try {
		const roomUrl = await createRoom(pageA, {
			name: 'Shared Export',
			template: 'Start / Stop / Continue'
		});
		await joinRoom(pageA, 'Alice');
		await addCardUnder(pageA, 'Start', 'something');

		await pageB.goto(roomUrl);
		await joinRoom(pageB, 'Bob');
		await expect(pageB.getByText('something')).toBeVisible();

		const downloadPromise = pageB.waitForEvent('download');
		await openExportModal(pageB);
		await chooseAndConfirm(pageB, 'CSV');
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/^shared-export-\d{4}-\d{2}-\d{2}\.csv$/);
	} finally {
		await closeAll();
	}
});

test('export works in the Closed phase', async ({ page }) => {
	await seedRetro(page);
	await advancePhase(page, 'Closed');

	await openExportModal(page);
	const downloadPromise = page.waitForEvent('download');
	await chooseAndConfirm(page, 'CSV');
	const download = await downloadPromise;

	const stream = await download.createReadStream();
	const chunks: Buffer[] = [];
	for await (const c of stream) chunks.push(c as Buffer);
	const csv = Buffer.concat(chunks).toString('utf-8');
	expect(csv).toContain('side quests');
});
