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

describe('CreateRoomModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it('blocks submit when name is empty', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });
		const submit = screen.getByRole('button', { name: /create/i });
		await user.click(submit);
		expect(goto).not.toHaveBeenCalled();
		expect(ensureRoom).not.toHaveBeenCalled();
		expect(seedRoom).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
	});

	it('on valid submit: opens doc, seeds it, navigates to /r/<uuid>', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		const nameInput = screen.getByLabelText(/room name/i);
		await user.type(nameInput, 'Sprint 42');

		await user.click(screen.getByRole('radio', { name: /start \/ stop \/ continue/i }));

		await user.click(screen.getByRole('button', { name: /create/i }));

		expect(ensureRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledWith(expect.anything(), {
			name: 'Sprint 42',
			templateId: 'start-stop-continue',
			votesPerParticipant: 5
		});

		expect(goto).toHaveBeenCalledTimes(1);
		const target = vi.mocked(goto).mock.calls[0][0] as string;
		expect(target).toMatch(
			/^\/r\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});

	it('records the new room in the sidecar index on submit', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		await user.type(screen.getByLabelText(/room name/i), 'Sprint 42');
		await user.click(screen.getByRole('radio', { name: /start \/ stop \/ continue/i }));
		await user.click(screen.getByRole('button', { name: /create/i }));

		const rooms = listRooms();
		expect(rooms).toHaveLength(1);
		expect(rooms[0]).toMatchObject({
			name: 'Sprint 42',
			templateId: 'start-stop-continue'
		});
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
		await user.click(screen.getByRole('button', { name: /create/i }));

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
		await user.click(screen.getByRole('button', { name: /create/i }));

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
		await user.click(screen.getByRole('button', { name: /create/i }));

		expect(seedRoom).not.toHaveBeenCalled();
		expect(goto).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/positive integer/i);
	});

	it('trims whitespace from the room name before seeding', async () => {
		const user = userEvent.setup();
		render(CreateRoomModal, { open: true, onClose: () => {} });

		await user.type(screen.getByLabelText(/room name/i), '   Sprint 42   ');
		await user.click(screen.getByRole('button', { name: /create/i }));

		expect(seedRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ name: 'Sprint 42' })
		);
	});
});
