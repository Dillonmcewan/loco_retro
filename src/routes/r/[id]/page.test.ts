import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import * as Y from 'yjs';

/**
 * These tests drive the room route against a real `Y.Doc` seeded by `seedRoom`
 * and the real `$lib/room` store helpers / mutation functions. Only the
 * provider/persistence side is replaced — `ensureRoom` returns a hand-built
 * `OpenRoom` whose `doc` is real and whose `awareness` is a tiny in-memory
 * fake that satisfies the participants store contract. Everything else
 * (CRDT reads/writes, store subscriptions, phase advancement) exercises
 * production code.
 */

type FakeAwareness = {
	setLocalStateField: (key: string, value: unknown) => void;
	getStates: () => Map<number, Record<string, unknown>>;
	on: (event: 'change', handler: () => void) => void;
	off: (event: 'change', handler: () => void) => void;
};

function makeFakeAwareness(clientId: number): FakeAwareness {
	let state: Record<string, unknown> = {};
	const listeners = new Set<() => void>();
	return {
		setLocalStateField(key, value) {
			state = { ...state, [key]: value };
			listeners.forEach((l) => l());
		},
		getStates() {
			return new Map([[clientId, state]]);
		},
		on(_event, handler) {
			listeners.add(handler);
		},
		off(_event, handler) {
			listeners.delete(handler);
		}
	};
}

// Hoisted holder so the vi.mock factory (which is itself hoisted) can read
// the room built fresh per test in beforeEach.
const { roomHolder } = vi.hoisted(() => ({
	roomHolder: { room: null as unknown }
}));

vi.mock('$lib/room', async () => {
	const actual = await vi.importActual<typeof import('$lib/room')>('$lib/room');
	return {
		...actual,
		ensureRoom: vi.fn(() => roomHolder.room),
		leaveRoom: vi.fn()
	};
});

vi.mock('$lib/displayName', async () => {
	const actual = await vi.importActual<typeof import('$lib/displayName')>('$lib/displayName');
	return {
		...actual,
		getAuthorId: vi.fn(() => 'me')
	};
});

import RoomPage from './+page.svelte';
import { setDisplayName } from '$lib/displayName';
import { seedRoom, addCard, type OpenRoom } from '$lib/room';

const VALID_ID = '11111111-1111-4111-8111-111111111111';

let awareness: FakeAwareness;

function buildRoom(): { doc: Y.Doc; awareness: FakeAwareness } {
	const doc = new Y.Doc();
	seedRoom(doc, { name: 'Sprint 42', templateId: 'wwd-actions' });
	addCard(doc, { columnId: 'went-well', text: 'mine', author: 'Dillon', authorId: 'me' });
	addCard(doc, {
		columnId: 'went-well',
		text: 'theirs',
		author: 'Other',
		authorId: 'someone-else'
	});
	const aw = makeFakeAwareness(1);
	const room: OpenRoom = {
		doc,
		awareness: aw as unknown as OpenRoom['awareness'],
		provider: {} as OpenRoom['provider'],
		persistence: {} as OpenRoom['persistence'],
		destroy: vi.fn()
	};
	roomHolder.room = room;
	return { doc, awareness: aw };
}

describe('Room page', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		({ awareness } = buildRoom());
	});

	it('shows the display-name gate when no name is saved', async () => {
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getByRole('heading', { name: /join the retro/i })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: /sprint 42/i })).not.toBeInTheDocument();
	});

	it('skips the gate and renders the room shell when a name is already saved', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getByRole('heading', { name: /sprint 42/i })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: /join the retro/i })).not.toBeInTheDocument();
		expect(awareness.getStates().get(1)?.user).toEqual({
			name: 'Dillon',
			authorId: 'me',
			ready: false
		});
		expect(screen.getByRole('heading', { name: /went well/i })).toBeInTheDocument();
	});

	it('renders cards under the right column with ownership-gated affordances', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getByText('mine')).toBeInTheDocument();
		expect(screen.getByText('theirs')).toBeInTheDocument();

		// Owner sees Edit + Delete only on their own card.
		expect(screen.getAllByRole('button', { name: /edit card/i })).toHaveLength(1);
		expect(screen.getAllByRole('button', { name: /delete card/i })).toHaveLength(1);
	});

	it('renders PhaseControls in the seeded Collect state', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Collect/);
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent('1 of 4');
		expect(screen.getByRole('button', { name: /^go back:/i })).toBeDisabled();
	});

	it('shows CardForm in Collect and hides it after Advance', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getAllByLabelText(/new card text/i).length).toBeGreaterThan(0);

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();

		expect(screen.queryByLabelText(/new card text/i)).not.toBeInTheDocument();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Vote/);
	});

	it('Advance walks through Vote → Discuss → Closed and disables Advance at the end', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Vote/);

		await user.click(screen.getByRole('button', { name: 'Advance: Discuss' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Discuss/);

		await user.click(screen.getByRole('button', { name: 'Advance: Closed' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Closed/);
		expect(screen.getByRole('button', { name: 'Advance: Closed' })).toBeDisabled();
	});

	it('Vote phase: shows VoteBudget and per-card VoteControls; no aggregate badges', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		// In Collect: no voting UI.
		expect(screen.queryByLabelText(/votes remaining/i)).not.toBeInTheDocument();
		expect(screen.queryAllByRole('button', { name: /cast a vote/i })).toHaveLength(0);

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();

		expect(screen.getByLabelText(/votes remaining/i)).toHaveTextContent('5 / 5');
		// One pair of VoteControls per card.
		expect(screen.getAllByRole('button', { name: /cast a vote/i }).length).toBeGreaterThanOrEqual(
			2
		);
		// No aggregate badge during Vote.
		expect(screen.queryAllByLabelText(/total votes/i)).toHaveLength(0);
	});

	it('Vote phase: casting a vote decrements the budget and bumps the per-card count', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();
		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();

		const plusButtons = screen.getAllByRole('button', { name: /cast a vote/i });
		await user.click(plusButtons[0]);
		await tick();

		expect(screen.getByLabelText(/votes remaining/i)).toHaveTextContent('4 / 5');
	});

	it('Discuss phase: hides VoteBudget + controls; renders aggregate badges from non-zero totals', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();
		const plusButtons = screen.getAllByRole('button', { name: /cast a vote/i });
		await user.click(plusButtons[0]);
		await user.click(plusButtons[0]);
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Discuss' }));
		await tick();

		expect(screen.queryByLabelText(/votes remaining/i)).not.toBeInTheDocument();
		expect(screen.queryAllByRole('button', { name: /cast a vote/i })).toHaveLength(0);

		const badges = screen.getAllByLabelText(/total votes/i);
		expect(badges).toHaveLength(1);
		expect(badges[0]).toHaveTextContent(/Votes:\s*2/);
	});

	it('Discuss phase: sorts cards by vote total desc, tie-broken by createdAt asc', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();

		// "theirs" is the second card (newer createdAt); cast 2 votes on it
		// so it should sort above "mine" in Discuss.
		const plusButtons = screen.getAllByRole('button', { name: /cast a vote/i });
		await user.click(plusButtons[1]);
		await user.click(plusButtons[1]);
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Discuss' }));
		await tick();

		const rendered = screen.getAllByText(/^(mine|theirs)$/).map((el) => el.textContent);
		expect(rendered).toEqual(['theirs', 'mine']);
	});

	it('Discuss phase: discussed toggle flips the card to a discussed state', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance: Vote' }));
		await tick();
		await user.click(screen.getByRole('button', { name: 'Advance: Discuss' }));
		await tick();

		const toggles = screen.getAllByRole('button', { name: /mark as discussed/i });
		expect(toggles.length).toBeGreaterThanOrEqual(2);

		await user.click(toggles[0]);
		await tick();

		expect(screen.getAllByRole('button', { name: /mark as not discussed/i })).toHaveLength(1);
	});

	it('Collect phase: toggling the ready button broadcasts ready=true and flips copy', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		// Default state: not ready.
		expect(awareness.getStates().get(1)?.user).toMatchObject({ ready: false });
		const toggle = screen.getByRole('button', { name: /i'm done/i });
		expect(toggle).toBeInTheDocument();

		await user.click(toggle);
		await tick();

		expect(awareness.getStates().get(1)?.user).toMatchObject({ ready: true });
		expect(screen.getByRole('button', { name: /done adding cards/i })).toBeInTheDocument();
	});

	it('Collect phase: cards render in insertion order even when vote totals differ', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		const rendered = screen.getAllByText(/^(mine|theirs)$/).map((el) => el.textContent);
		expect(rendered).toEqual(['mine', 'theirs']);
	});

	it('persists the name on gate submit and reveals the room', async () => {
		const user = userEvent.setup();
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		const input = screen.getByLabelText(/display name/i);
		await user.type(input, 'Dillon');
		await user.click(screen.getByRole('button', { name: /join/i }));

		expect(localStorage.getItem('loco_retro:displayName')).toBe('Dillon');
		expect(awareness.getStates().get(1)?.user).toEqual({
			name: 'Dillon',
			authorId: 'me',
			ready: false
		});
		expect(screen.getByRole('heading', { name: /sprint 42/i })).toBeInTheDocument();
	});
});
