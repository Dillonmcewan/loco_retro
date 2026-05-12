import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(async () => {})
}));

import RoomTile from './RoomTile.svelte';
import { goto } from '$app/navigation';
import type { RoomIndexEntry } from './rooms';

function makeEntry(overrides: Partial<RoomIndexEntry> = {}): RoomIndexEntry {
	return {
		id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		name: 'Sprint 42',
		templateId: 'wwd-actions',
		lastOpenedAt: Date.now(),
		...overrides
	};
}

describe('RoomTile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders the room name and resolved template label', () => {
		render(RoomTile, { entry: makeEntry({ templateId: 'start-stop-continue' }) });
		expect(screen.getByText('Sprint 42')).toBeInTheDocument();
		expect(screen.getByText('Start / Stop / Continue')).toBeInTheDocument();
	});

	it('falls back to the raw templateId when no preset matches', () => {
		render(RoomTile, { entry: makeEntry({ templateId: 'custom-future-template' }) });
		expect(screen.getByText('custom-future-template')).toBeInTheDocument();
	});

	it('renders a relative timestamp', () => {
		render(RoomTile, { entry: makeEntry({ lastOpenedAt: Date.now() - 5 * 60_000 }) });
		expect(screen.getByText('5m ago')).toBeInTheDocument();
	});

	it('navigates to /r/<id> on click', async () => {
		const user = userEvent.setup();
		const entry = makeEntry();
		render(RoomTile, { entry });

		await user.click(screen.getByRole('button', { name: /open retro: sprint 42/i }));

		expect(goto).toHaveBeenCalledWith(`/r/${entry.id}`);
	});
});
