import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(async () => {})
}));

vi.mock('$lib/room', async () => {
	const actual = await vi.importActual<typeof import('$lib/room')>('$lib/room');
	return {
		...actual,
		ensureRoom: vi.fn(() => ({ doc: { getMap: () => ({ get: () => undefined }) } })),
		seedRoom: vi.fn(() => true),
		leaveRoom: vi.fn()
	};
});

import CreateRoomModal from './CreateRoomModal.svelte';
import { goto } from '$app/navigation';
import { ensureRoom, seedRoom } from '$lib/room';
import { listRooms } from './rooms';
import { PRESET_TEMPLATES } from './templates';

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

describe('CreateRoomModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('blocks submit when name is empty', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });
		const submit = screen.getByRole('button', { name: /^create retro/i });
		await user.click(submit);
		expect(goto).not.toHaveBeenCalled();
		expect(ensureRoom).not.toHaveBeenCalled();
		expect(seedRoom).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
	});

	it('with no history, shows the first three presets as recent cards', () => {
		render(CreateRoomModal, { open: true, onClose: () => {} });
		const labels = PRESET_TEMPLATES.slice(0, 3).map((t) => t.label);
		for (const label of labels) {
			expect(
				screen.getByRole('button', { name: new RegExp(escapeRegex(label)) })
			).toBeInTheDocument();
		}
		expect(screen.getByRole('button', { name: /more templates/i })).toBeInTheDocument();
	});

	it('on valid submit: opens doc, seeds it with columns, navigates to /r/<uuid>', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const nameInput = screen.getByLabelText(/room name/i);
		await user.type(nameInput, 'Sprint 42');

		const startStop = PRESET_TEMPLATES.find((t) => t.label === 'Start / Stop / Continue')!;
		await user.click(
			screen.getByRole('button', { name: new RegExp(escapeRegex(startStop.label)) })
		);

		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		expect(ensureRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledWith(expect.anything(), {
			name: 'Sprint 42',
			columns: startStop.columns.map((c) => ({ title: c.title })),
			votesPerParticipant: 5
		});

		expect(goto).toHaveBeenCalledTimes(1);
		const target = vi.mocked(goto).mock.calls[0][0] as string;
		expect(target).toMatch(
			/^\/r\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});

	it('records the new room with columnTitles in the sidecar index', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const startStop = PRESET_TEMPLATES.find((t) => t.label === 'Start / Stop / Continue')!;
		await user.type(screen.getByLabelText(/room name/i), 'Sprint 42');
		await user.click(
			screen.getByRole('button', { name: new RegExp(escapeRegex(startStop.label)) })
		);
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		const rooms = listRooms();
		expect(rooms).toHaveLength(1);
		expect(rooms[0]).toMatchObject({
			name: 'Sprint 42',
			columnTitles: startStop.columns.map((c) => c.title)
		});
		expect(rooms[0].templateName).toBeUndefined();
		expect(rooms[0].id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});

	it('defaults the votes-per-participant input to 5 and forwards it to seedRoom', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const votes = screen.getByLabelText(/votes per participant/i) as HTMLInputElement;
		expect(votes.value).toBe('5');

		await user.type(screen.getByLabelText(/room name/i), 'X');
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		expect(seedRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ votesPerParticipant: 5 })
		);
	});

	it('forwards a custom votes value to seedRoom', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const votes = screen.getByLabelText(/votes per participant/i) as HTMLInputElement;
		await user.clear(votes);
		await user.type(votes, '12');

		await user.type(screen.getByLabelText(/room name/i), 'X');
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		expect(seedRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ votesPerParticipant: 12 })
		);
	});

	it('rejects votes-per-participant < 1', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const votes = screen.getByLabelText(/votes per participant/i) as HTMLInputElement;
		await user.clear(votes);
		await user.type(votes, '0');

		await user.type(screen.getByLabelText(/room name/i), 'X');
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		expect(seedRoom).not.toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/positive integer/i);
	});

	it('trims whitespace from the room name before seeding', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		await user.type(screen.getByLabelText(/room name/i), '   Sprint 42   ');
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		expect(seedRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ name: 'Sprint 42' })
		);
	});

	it('preserves templateName when re-using a named template from recents', async () => {
		const { upsertRoom } = await import('./rooms');
		upsertRoom({
			id: '33333333-3333-4333-8333-333333333333',
			name: 'Older',
			columnTitles: ['Mind', 'Body', 'Soul'],
			templateName: 'My ritual',
			lastOpenedAt: 1
		});
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });
		await user.click(screen.getByRole('button', { name: /My ritual/ }));
		await user.type(screen.getByLabelText(/room name/i), 'New retro');
		await user.click(screen.getByRole('button', { name: /^create retro/i }));

		const rooms = listRooms();
		const newEntry = rooms.find((r) => r.name === 'New retro');
		expect(newEntry?.templateName).toBe('My ritual');
		expect(newEntry?.columnTitles).toEqual(['Mind', 'Body', 'Soul']);
	});

	it('"More templates" button opens the picker dialog', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });
		await user.click(screen.getByRole('button', { name: /more templates/i }));
		// Picker dialog has a heading
		expect(await screen.findByRole('heading', { name: /choose a template/i })).toBeInTheDocument();
	});
});
