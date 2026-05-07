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

vi.mock('$lib/room/store', async () => {
	const { readable } = await import('svelte/store');
	return {
		ensureRoom: vi.fn(() => ({
			doc: {},
			awareness: mockAwareness,
			provider: {},
			persistence: {},
			destroy: vi.fn()
		})),
		leaveRoom: vi.fn(),
		roomMetaStore: vi.fn(() => readable({ name: 'Sprint 42', templateId: 'wwd-actions' })),
		columnsStore: vi.fn(() =>
			readable([
				{ id: 'went-well', title: 'Went well' },
				{ id: 'didnt', title: "Didn't go well" }
			])
		),
		participantsStore: vi.fn(() => readable([{ clientId: 1, name: 'Dillon' }]))
	};
});

import RoomPage from './+page.svelte';
import { setDisplayName } from '$lib/identity/displayName';

const VALID_ID = '11111111-1111-4111-8111-111111111111';

describe('Room page', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
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
