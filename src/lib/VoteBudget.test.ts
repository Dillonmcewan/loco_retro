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

describe('VoteBudget.svelte (normal mode)', () => {
	it('renders X / N votes remaining as a passive span', () => {
		const { container } = render(VoteBudget, { props: baseProps({ remaining: 3, total: 5 }) });
		expect(screen.getByText('3 / 5')).toBeInTheDocument();
		expect(screen.getByText(/votes remaining/i)).toBeInTheDocument();
		// No interactive control in normal mode.
		expect(container.querySelector('button.status-badge')).toBeNull();
		expect(container.querySelector('span.status-badge')).not.toBeNull();
	});

	it('flips to "Done voting!" with .done styling when done is true', () => {
		const { container } = render(VoteBudget, { props: baseProps({ done: true }) });
		expect(screen.getByText(/Done voting!/i)).toBeInTheDocument();
		expect(container.querySelector('.status-badge.done')).not.toBeNull();
		// Still passive — no button.
		expect(container.querySelector('button.status-badge')).toBeNull();
	});
});

describe('VoteBudget.svelte (Chris mode)', () => {
	it("renders as an interactive button with the I'm done affordance", () => {
		const { container } = render(VoteBudget, {
			props: baseProps({ unlimited: true })
		});
		const btn = container.querySelector('button.status-badge');
		expect(btn).not.toBeNull();
		expect(screen.getByText(/I'm done/i)).toBeInTheDocument();
	});

	it('renders an ∞ icon instead of X / N counts', () => {
		const { container } = render(VoteBudget, {
			props: baseProps({ unlimited: true, remaining: 99, total: 5 })
		});
		expect(container.textContent).not.toMatch(/99 \/ 5/);
	});

	it('fires onToggleDone when clicked', async () => {
		const onToggleDone = vi.fn();
		const { container } = render(VoteBudget, {
			props: baseProps({ unlimited: true, onToggleDone })
		});
		await fireEvent.click(container.querySelector('button.status-badge')!);
		expect(onToggleDone).toHaveBeenCalledOnce();
	});

	it('reflects done state in aria-pressed + action-describing aria-label', () => {
		const { container, rerender } = render(VoteBudget, {
			props: baseProps({ unlimited: true, done: false })
		});
		const btn = () => container.querySelector('button.status-badge')!;
		expect(btn().getAttribute('aria-pressed')).toBe('false');
		expect(btn().getAttribute('aria-label')).toMatch(/mark voting complete/i);

		rerender(baseProps({ unlimited: true, done: true }));
		expect(btn().getAttribute('aria-pressed')).toBe('true');
		expect(btn().getAttribute('aria-label')).toMatch(/mark voting incomplete/i);
	});
});
