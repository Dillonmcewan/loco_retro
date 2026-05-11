import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VoteBudget from './VoteBudget.svelte';

describe('VoteBudget.svelte', () => {
	it('renders X / N votes remaining', () => {
		render(VoteBudget, { props: { remaining: 3, total: 5 } });
		expect(screen.getByLabelText(/votes remaining/i)).toBeInTheDocument();
		expect(screen.getByText('3 / 5')).toBeInTheDocument();
		expect(screen.getByText(/votes remaining/i)).toBeInTheDocument();
	});

	it('flags depletion via a class hook when remaining hits 0', () => {
		const { container } = render(VoteBudget, { props: { remaining: 0, total: 5 } });
		expect(container.querySelector('.budget.depleted')).not.toBeNull();
	});

	it('does not flag depletion when remaining > 0', () => {
		const { container } = render(VoteBudget, { props: { remaining: 1, total: 5 } });
		expect(container.querySelector('.budget.depleted')).toBeNull();
	});
});
