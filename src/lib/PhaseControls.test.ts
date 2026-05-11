import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PhaseControls from './PhaseControls.svelte';
import type { Phase } from './room';

function setup(phase: Phase) {
	const onAdvance = vi.fn();
	const onBack = vi.fn();
	return { ...render(PhaseControls, { props: { phase, onAdvance, onBack } }), onAdvance, onBack };
}

describe('PhaseControls.svelte', () => {
	it('renders the phase label and step number for each phase', () => {
		const cases: Array<[Phase, string, string]> = [
			['collect', 'Collect', '1 of 4'],
			['vote', 'Vote', '2 of 4'],
			['discuss', 'Discuss', '3 of 4'],
			['closed', 'Closed', '4 of 4']
		];
		for (const [phase, label, count] of cases) {
			const { unmount } = setup(phase);
			expect(screen.getByText(label)).toBeInTheDocument();
			expect(screen.getByText(count)).toBeInTheDocument();
			unmount();
		}
	});

	it('disables Back at collect and enables it elsewhere', () => {
		const { unmount } = setup('collect');
		expect(screen.getByRole('button', { name: /go back:/i })).toBeDisabled();
		unmount();

		setup('vote');
		expect(screen.getByRole('button', { name: /go back:/i })).toBeEnabled();
	});

	it('advance aria-label names the destination phase', () => {
		const cases: Array<[Phase, string]> = [
			['collect', 'Advance: Vote'],
			['vote', 'Advance: Discuss'],
			['discuss', 'Advance: Closed']
		];
		for (const [phase, name] of cases) {
			const { unmount } = setup(phase);
			expect(screen.getByRole('button', { name })).toBeInTheDocument();
			unmount();
		}
	});

	it('back aria-label names the destination phase', () => {
		const cases: Array<[Phase, string]> = [
			['vote', 'Go back: Collect'],
			['discuss', 'Go back: Vote'],
			['closed', 'Go back: Discuss']
		];
		for (const [phase, name] of cases) {
			const { unmount } = setup(phase);
			expect(screen.getByRole('button', { name })).toBeInTheDocument();
			unmount();
		}
	});

	it('disables the Advance button on closed instead of hiding it', () => {
		setup('closed');
		const advance = screen.getByRole('button', { name: /^advance:/i });
		expect(advance).toBeInTheDocument();
		expect(advance).toBeDisabled();
	});

	it('clicking Advance fires onAdvance', async () => {
		const user = userEvent.setup();
		const { onAdvance } = setup('collect');
		await user.click(screen.getByRole('button', { name: /^advance:/i }));
		expect(onAdvance).toHaveBeenCalledOnce();
	});

	it('clicking Back fires onBack', async () => {
		const user = userEvent.setup();
		const { onBack } = setup('vote');
		await user.click(screen.getByRole('button', { name: /^go back:/i }));
		expect(onBack).toHaveBeenCalledOnce();
	});
});
