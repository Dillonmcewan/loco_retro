import {
	expect,
	type Browser,
	type BrowserContext,
	type Locator,
	type Page
} from '@playwright/test';

export const ROOM_URL_PATTERN = /\/r\/[0-9a-f-]{36}$/i;

export interface CreateRoomOptions {
	name: string;
	/** Template label to click. Omit to leave the default selection. */
	template?: string;
	votesPerParticipant?: number;
	chrisMode?: boolean;
}

/** Create a room via the modal and assert the URL. Returns the room URL. */
export async function createRoom(page: Page, opts: CreateRoomOptions): Promise<string> {
	await page.goto('/');
	await page.getByRole('button', { name: /create a new retro/i }).click();
	await page.getByLabel('Room name').fill(opts.name);
	if (opts.template) {
		await page.getByText(opts.template).click();
	}
	if (opts.chrisMode) {
		await page.getByLabel(/chris mode/i).check();
	}
	if (opts.votesPerParticipant !== undefined) {
		await page.getByLabel('Votes per participant').fill(String(opts.votesPerParticipant));
	}
	await page.getByRole('button', { name: /create retro/i }).click();
	await expect(page).toHaveURL(ROOM_URL_PATTERN);
	return page.url();
}

/** Fill the display-name gate and wait for it to dismiss. */
export async function joinRoom(page: Page, name: string): Promise<void> {
	await page.getByLabel('Display name').fill(name);
	await page.getByRole('button', { name: 'Join' }).click();
	await expect(page.getByRole('button', { name: 'Join' })).toHaveCount(0);
}

/** Locate a column article by its heading text. */
export function columnLocator(page: Page, columnTitle: string): Locator {
	return page
		.locator('article.column')
		.filter({ has: page.getByRole('heading', { name: columnTitle, exact: true }) });
}

/** Add a card under the named column. */
export async function addCardUnder(page: Page, columnTitle: string, text: string): Promise<void> {
	const column = columnLocator(page, columnTitle);
	await column.getByLabel('New card text').fill(text);
	await column.getByRole('button', { name: /add/i }).click();
}

/** Locate a card article by its text. */
export function cardLocator(page: Page, text: string): Locator {
	return page.locator('article.retro-card', { hasText: text });
}

/** Cast one vote on the card with the given text. */
export async function castVoteOn(page: Page, cardText: string): Promise<void> {
	await cardLocator(page, cardText)
		.getByRole('button', { name: /cast a vote/i })
		.click();
}

/** Retract one vote on the card with the given text. */
export async function retractVoteOn(page: Page, cardText: string): Promise<void> {
	await cardLocator(page, cardText)
		.getByRole('button', { name: /retract a vote/i })
		.click();
}

export type AdvancePhase = 'Vote' | 'Discuss' | 'Closed';
export type GoBackPhase = 'Collect' | 'Vote' | 'Discuss';

/** Click "Advance: <phase>" on the facilitator page. */
export async function advancePhase(page: Page, phase: AdvancePhase): Promise<void> {
	await page.getByRole('button', { name: `Advance: ${phase}` }).click();
}

/** Click "Go back: <phase>". */
export async function goBackToPhase(page: Page, phase: GoBackPhase): Promise<void> {
	await page.getByRole('button', { name: `Go back: ${phase}` }).click();
}

export interface TwoClients {
	ctxA: BrowserContext;
	pageA: Page;
	ctxB: BrowserContext;
	pageB: Page;
	closeAll(): Promise<void>;
}

/** Two isolated browser contexts + pages. Returns a teardown helper. */
export async function setupTwoClients(browser: Browser): Promise<TwoClients> {
	const ctxA = await browser.newContext();
	const ctxB = await browser.newContext();
	const pageA = await ctxA.newPage();
	const pageB = await ctxB.newPage();
	return {
		ctxA,
		pageA,
		ctxB,
		pageB,
		closeAll: async () => {
			await ctxA.close();
			await ctxB.close();
		}
	};
}
