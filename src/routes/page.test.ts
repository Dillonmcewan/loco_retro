import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(async () => {})
}));

// The modal imports room internals; keep them inert so jsdom can mount it.
vi.mock('$lib/room', async () => {
	const actual = await vi.importActual<typeof import('$lib/room')>('$lib/room');
	return {
		...actual,
		ensureRoom: vi.fn(() => ({ doc: { getMap: () => ({ get: () => undefined }) } })),
		seedRoom: vi.fn(() => true),
		leaveRoom: vi.fn()
	};
});

import Dashboard from './+page.svelte';
import { upsertRoom } from '$lib/rooms';

describe('Dashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('renders the empty state when no rooms are in the index', () => {
		render(Dashboard);
		expect(screen.getByRole('button', { name: /create a new retro/i })).toBeInTheDocument();
		// Empty state shows decorative placeholder tiles.
		expect(screen.getByText(/your retros will appear here/i)).toBeInTheDocument();
		expect(screen.getByText(/click \+ to start your first one/i)).toBeInTheDocument();
	});

	it('renders one tile per indexed room, newest first', () => {
		upsertRoom({
			id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
			name: 'Older retro',
			columnTitles: ['Went well', "Didn't go well", 'Actions'],
			lastOpenedAt: 1_000
		});
		upsertRoom({
			id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
			name: 'Newer retro',
			columnTitles: ['Start', 'Stop', 'Continue'],
			lastOpenedAt: 2_000
		});

		render(Dashboard);

		const tiles = screen.getAllByRole('button', { name: /open retro/i });
		expect(tiles).toHaveLength(2);
		// First tile in DOM order should be the newest.
		expect(tiles[0]).toHaveAccessibleName(/newer retro/i);
		expect(tiles[1]).toHaveAccessibleName(/older retro/i);
	});

	it('opens the modal when the New Retro tile is clicked', async () => {
		const user = userEvent.setup();
		render(Dashboard);

		// Heading is hidden until the modal opens.
		expect(screen.queryByRole('heading', { name: /create a retro/i })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /create a new retro/i }));

		expect(screen.getByRole('heading', { name: /create a retro/i })).toBeInTheDocument();
	});
});
