import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(async () => {})
}));

import RoomTile from './RoomTile.svelte';
import { goto } from '$app/navigation';
import type { RoomIndexEntry } from './rooms';
import type { Phase } from './room';

function makeEntry(overrides: Partial<RoomIndexEntry> = {}): RoomIndexEntry {
	return {
		id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		name: 'Sprint 42',
		columnTitles: ['Went well', "Didn't go well", 'Actions'],
		lastOpenedAt: Date.now(),
		...overrides
	};
}

describe('RoomTile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the room name and derived label from columnTitles', () => {
		render(RoomTile, { entry: makeEntry({ columnTitles: ['Start', 'Stop', 'Continue'] }) });
		expect(screen.getByText('Sprint 42')).toBeInTheDocument();
		expect(screen.getByText('Start / Stop / Continue')).toBeInTheDocument();
	});

	it('prefers explicit templateName when present', () => {
		render(RoomTile, {
			entry: makeEntry({ columnTitles: ['A', 'B', 'C'], templateName: 'My ritual' })
		});
		expect(screen.getByText('My ritual')).toBeInTheDocument();
	});

	it('renders a relative timestamp', () => {
		render(RoomTile, { entry: makeEntry({ lastOpenedAt: Date.now() - 5 * 60_000 }) });
		expect(screen.getByText('5m ago')).toBeInTheDocument();
	});

	it('renders --card-accent + label matching entry.phase for every phase', () => {
		const cases: Array<[Phase, string]> = [
			['collect', 'Collect'],
			['vote', 'Vote'],
			['discuss', 'Discuss'],
			['closed', 'Closed']
		];
		for (const [phase, label] of cases) {
			const { container, unmount } = render(RoomTile, { entry: makeEntry({ phase }) });
			const tile = container.querySelector('.room-tile');
			expect(tile?.getAttribute('style')).toContain(`--card-accent: var(--color-phase-${phase})`);
			expect(screen.getByText(label)).toBeInTheDocument();
			unmount();
		}
	});

	it('defaults phase to collect when entry.phase is missing', () => {
		const { container } = render(RoomTile, { entry: makeEntry() });
		expect(container.querySelector('.room-tile')?.getAttribute('style')).toContain(
			'--card-accent: var(--color-phase-collect)'
		);
	});

	it('navigates to /r/<id> on click', async () => {
		const user = userEvent.setup();
		const entry = makeEntry();
		render(RoomTile, { entry });

		await user.click(screen.getByRole('button', { name: /open retro: sprint 42/i }));

		expect(goto).toHaveBeenCalledWith(`/r/${entry.id}`);
	});
});
