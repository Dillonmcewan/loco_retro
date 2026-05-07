import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

// Mock SvelteKit + Yjs-touching modules so the component can mount in jsdom.
vi.mock('$app/navigation', () => ({
	goto: vi.fn(async () => {})
}));

vi.mock('$lib/roomStore', () => ({
	ensureRoom: vi.fn(() => ({ doc: { getMap: () => ({ get: () => undefined }) } }))
}));

vi.mock('$lib/roomSeed', () => ({
	seedRoom: vi.fn(() => true)
}));

import CreatePage from './+page.svelte';
import { goto } from '$app/navigation';
import { ensureRoom } from '$lib/roomStore';
import { seedRoom } from '$lib/roomSeed';

describe('Create page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks submit when name is empty', async () => {
		const user = userEvent.setup();
		render(CreatePage);
		const submit = screen.getByRole('button', { name: /create/i });
		await user.click(submit);
		expect(goto).not.toHaveBeenCalled();
		expect(ensureRoom).not.toHaveBeenCalled();
		expect(seedRoom).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
	});

	it('on valid submit: opens doc, seeds it, navigates to /r/<uuid>', async () => {
		const user = userEvent.setup();
		render(CreatePage);

		const nameInput = screen.getByLabelText(/room name/i);
		await user.type(nameInput, 'Sprint 42');

		const templateSelect = screen.getByLabelText(/template/i);
		await user.selectOptions(templateSelect, 'start-stop-continue');

		await user.click(screen.getByRole('button', { name: /create/i }));

		expect(ensureRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledTimes(1);
		expect(seedRoom).toHaveBeenCalledWith(expect.anything(), {
			name: 'Sprint 42',
			templateId: 'start-stop-continue'
		});

		expect(goto).toHaveBeenCalledTimes(1);
		const target = vi.mocked(goto).mock.calls[0][0] as string;
		expect(target).toMatch(
			/^\/r\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
		);
	});

	it('trims whitespace from the room name before seeding', async () => {
		const user = userEvent.setup();
		render(CreatePage);

		await user.type(screen.getByLabelText(/room name/i), '   Sprint 42   ');
		await user.click(screen.getByRole('button', { name: /create/i }));

		expect(seedRoom).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ name: 'Sprint 42' })
		);
	});
});
