import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CollectStatus from './CollectStatus.svelte';

describe('CollectStatus.svelte', () => {
	it("renders the not-ready state with I'm done copy", () => {
		render(CollectStatus, { props: { ready: false, onToggle: () => {} } });
		const button = screen.getByRole('button', { name: /i'm done/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-pressed', 'false');
		expect(button.classList.contains('ready')).toBe(false);
	});

	it('renders the ready state with done copy and the done class', () => {
		const { container } = render(CollectStatus, { props: { ready: true, onToggle: () => {} } });
		const button = screen.getByRole('button', { name: /done adding cards/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('aria-pressed', 'true');
		expect(container.querySelector('.status-badge.done')).not.toBeNull();
	});

	it('calls onToggle when clicked', async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		render(CollectStatus, { props: { ready: false, onToggle } });

		await user.click(screen.getByRole('button', { name: /i'm done/i }));
		expect(onToggle).toHaveBeenCalledTimes(1);
	});
});
