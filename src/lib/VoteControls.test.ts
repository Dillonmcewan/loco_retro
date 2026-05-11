import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import VoteControls from './VoteControls.svelte';

function setup(props: { myCount: number; canIncrement: boolean }) {
	const onIncrement = vi.fn();
	const onDecrement = vi.fn();
	return {
		...render(VoteControls, { props: { ...props, onIncrement, onDecrement } }),
		onIncrement,
		onDecrement
	};
}

describe('VoteControls.svelte', () => {
	it('renders the current myCount', () => {
		setup({ myCount: 3, canIncrement: true });
		expect(screen.getByText('3')).toBeInTheDocument();
	});

	it('+ calls onIncrement when canIncrement', async () => {
		const user = userEvent.setup();
		const { onIncrement } = setup({ myCount: 0, canIncrement: true });
		await user.click(screen.getByRole('button', { name: /cast a vote/i }));
		expect(onIncrement).toHaveBeenCalledOnce();
	});

	it('+ is disabled when !canIncrement and does not call', async () => {
		const user = userEvent.setup();
		const { onIncrement } = setup({ myCount: 5, canIncrement: false });
		const plus = screen.getByRole('button', { name: /cast a vote/i });
		expect(plus).toBeDisabled();
		await user.click(plus);
		expect(onIncrement).not.toHaveBeenCalled();
	});

	it('− calls onDecrement only when myCount > 0', async () => {
		const user = userEvent.setup();
		const { onDecrement } = setup({ myCount: 2, canIncrement: true });
		await user.click(screen.getByRole('button', { name: /retract a vote/i }));
		expect(onDecrement).toHaveBeenCalledOnce();
	});

	it('− is disabled when myCount is 0', async () => {
		const user = userEvent.setup();
		const { onDecrement } = setup({ myCount: 0, canIncrement: true });
		const minus = screen.getByRole('button', { name: /retract a vote/i });
		expect(minus).toBeDisabled();
		await user.click(minus);
		expect(onDecrement).not.toHaveBeenCalled();
	});
});
