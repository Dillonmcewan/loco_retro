import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';

const mockAwareness = {
	setLocalStateField: vi.fn(),
	getStates: () => new Map(),
	on: vi.fn(),
	off: vi.fn()
};

const mockCards = {
	'went-well': [
		{
			id: 'card-mine',
			text: 'mine',
			author: 'Dillon',
			authorId: 'me',
			createdAt: 0
		},
		{
			id: 'card-foreign',
			text: 'theirs',
			author: 'Other',
			authorId: 'someone-else',
			createdAt: 0
		}
	],
	didnt: []
};

const PHASE_ORDER_MOCK = ['collect', 'vote', 'discuss', 'closed'] as const;
type MockPhase = (typeof PHASE_ORDER_MOCK)[number];
type MetaSnap = { name: string; templateId: string; phase: MockPhase };

let metaSetter: ((v: MetaSnap) => void) | null = null;
let currentPhase: MockPhase = 'collect';

function nextPhase(p: MockPhase): MockPhase {
	const i = PHASE_ORDER_MOCK.indexOf(p);
	return i < PHASE_ORDER_MOCK.length - 1 ? PHASE_ORDER_MOCK[i + 1] : p;
}
function prevPhase(p: MockPhase): MockPhase {
	const i = PHASE_ORDER_MOCK.indexOf(p);
	return i > 0 ? PHASE_ORDER_MOCK[i - 1] : p;
}

vi.mock('$lib/room', async () => {
	const { readable } = await import('svelte/store');
	const actual = await vi.importActual<typeof import('$lib/room')>('$lib/room');
	return {
		...actual,
		ensureRoom: vi.fn(() => ({
			doc: {},
			awareness: mockAwareness,
			provider: {},
			persistence: {},
			destroy: vi.fn()
		})),
		leaveRoom: vi.fn(),
		roomMetaStore: vi.fn(() =>
			readable<MetaSnap>(
				{ name: 'Sprint 42', templateId: 'wwd-actions', phase: currentPhase },
				(set) => {
					metaSetter = set;
					return () => {
						metaSetter = null;
					};
				}
			)
		),
		columnsStore: vi.fn(() =>
			readable([
				{ id: 'went-well', title: 'Went well' },
				{ id: 'didnt', title: "Didn't go well" }
			])
		),
		cardsStore: vi.fn(() => readable(mockCards)),
		participantsStore: vi.fn(() => readable([{ clientId: 1, name: 'Dillon' }])),
		addCard: vi.fn(),
		editCard: vi.fn(),
		deleteCard: vi.fn(),
		advancePhase: vi.fn(() => {
			currentPhase = nextPhase(currentPhase);
			metaSetter?.({ name: 'Sprint 42', templateId: 'wwd-actions', phase: currentPhase });
			return currentPhase;
		}),
		stepBackPhase: vi.fn(() => {
			currentPhase = prevPhase(currentPhase);
			metaSetter?.({ name: 'Sprint 42', templateId: 'wwd-actions', phase: currentPhase });
			return currentPhase;
		})
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

const VALID_ID = '11111111-1111-4111-8111-111111111111';

describe('Room page', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
		currentPhase = 'collect';
		metaSetter = null;
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
		expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('user', { name: 'Dillon' });

		// Columns from the mocked store render.
		expect(screen.getByRole('heading', { name: /went well/i })).toBeInTheDocument();
	});

	it('renders cards under the right column with ownership-gated affordances', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		// Both cards render.
		expect(screen.getByText('mine')).toBeInTheDocument();
		expect(screen.getByText('theirs')).toBeInTheDocument();

		// Owner sees one Edit + one Delete (for their own card only).
		expect(screen.getAllByRole('button', { name: /edit card/i })).toHaveLength(1);
		expect(screen.getAllByRole('button', { name: /delete card/i })).toHaveLength(1);
	});

	it('renders PhaseControls in the seeded Collect state', async () => {
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Collect/);
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent('1 of 4');
		expect(screen.getByRole('button', { name: /back to previous phase/i })).toBeDisabled();
	});

	it('shows CardForm in Collect and hides it after Advance', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		expect(screen.getAllByLabelText(/new card text/i).length).toBeGreaterThan(0);

		await user.click(screen.getByRole('button', { name: 'Advance' }));
		await tick();

		expect(screen.queryByLabelText(/new card text/i)).not.toBeInTheDocument();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Vote/);
	});

	it('Advance walks through Vote → Discuss → Closed and hides Advance at the end', async () => {
		const user = userEvent.setup();
		setDisplayName('Dillon');
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		await user.click(screen.getByRole('button', { name: 'Advance' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Vote/);

		await user.click(screen.getByRole('button', { name: 'Advance' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Discuss/);
		expect(screen.getByRole('button', { name: 'Close room' })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Close room' }));
		await tick();
		expect(screen.getByLabelText(/current phase/i)).toHaveTextContent(/Closed/);
		expect(screen.getByRole('button', { name: 'Advance' })).toBeDisabled();
		expect(screen.queryByRole('button', { name: /close room/i })).not.toBeInTheDocument();
	});

	it('persists the name on gate submit and reveals the room', async () => {
		const user = userEvent.setup();
		render(RoomPage, { props: { data: { id: VALID_ID } } });
		await tick();

		const input = screen.getByLabelText(/display name/i);
		await user.type(input, 'Dillon');
		await user.click(screen.getByRole('button', { name: /join/i }));

		expect(localStorage.getItem('loco_retro:displayName')).toBe('Dillon');
		expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('user', { name: 'Dillon' });
		expect(screen.getByRole('heading', { name: /sprint 42/i })).toBeInTheDocument();
	});
});
