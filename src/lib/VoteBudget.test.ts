import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import VoteBudget from './VoteBudget.svelte';

function baseProps(
	overrides: Partial<{
		remaining: number;
		total: number;
		unlimited: boolean;
		done: boolean;
		onToggleDone: () => void;
	}> = {}
) {
	return {
		remaining: 3,
		total: 5,
		unlimited: false,
		done: false,
		onToggleDone: () => {},
		...overrides
	};
}

describe('VoteBudget.svelte', () => {
	it('renders X / N when not unlimited and not done', () => {
		render(VoteBudget, { props: baseProps({ remaining: 3, total: 5 }) });
		expect(screen.getByText('3 / 5')).toBeInTheDocument();
		expect(screen.getByText(/I'm done/i)).toBeInTheDocument();
	});

	it('renders the green "Done voting!" state when done is true', () => {
		const { container } = render(VoteBudget, { props: baseProps({ done: true }) });
		expect(screen.getByText(/Done voting!/i)).toBeInTheDocument();
		expect(container.querySelector('.budget.done')).not.toBeNull();
	});

	it('renders an ∞ icon when unlimited', () => {
		const { container } = render(VoteBudget, {
			props: baseProps({ unlimited: true, remaining: 99, total: 5 })
		});
		// numbers slot should not show "99 / 5" in unlimited mode
		expect(container.textContent).not.toMatch(/99 \/ 5/);
		expect(screen.getByText(/I'm done/i)).toBeInTheDocument();
	});

	it('fires onToggleDone when clicked', async () => {
		const onToggleDone = vi.fn();
		render(VoteBudget, { props: baseProps({ onToggleDone }) });
		await fireEvent.click(screen.getByLabelText(/votes remaining/i));
		expect(onToggleDone).toHaveBeenCalledOnce();
	});

	it('reflects done state in aria-pressed', () => {
		const { container, rerender } = render(VoteBudget, { props: baseProps({ done: false }) });
		expect(container.querySelector('[aria-pressed="false"]')).not.toBeNull();
		rerender(baseProps({ done: true }));
		expect(container.querySelector('[aria-pressed="true"]')).not.toBeNull();
	});
});
