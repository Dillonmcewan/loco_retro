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
		expect(screen.getByRole('button', { name: /back to previous phase/i })).toBeDisabled();
		unmount();

		setup('vote');
		expect(screen.getByRole('button', { name: /back to previous phase/i })).toBeEnabled();
	});

	it('Advance label is Advance on collect/vote and Close room on discuss', () => {
		const { unmount: u1 } = setup('collect');
		expect(screen.getByRole('button', { name: 'Advance' })).toBeInTheDocument();
		u1();

		const { unmount: u2 } = setup('vote');
		expect(screen.getByRole('button', { name: 'Advance' })).toBeInTheDocument();
		u2();

		setup('discuss');
		expect(screen.getByRole('button', { name: 'Close room' })).toBeInTheDocument();
	});

	it('hides the Advance button on closed', () => {
		setup('closed');
		expect(screen.queryByRole('button', { name: /advance/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /close room/i })).not.toBeInTheDocument();
	});

	it('clicking Advance fires onAdvance', async () => {
		const user = userEvent.setup();
		const { onAdvance } = setup('collect');
		await user.click(screen.getByRole('button', { name: 'Advance' }));
		expect(onAdvance).toHaveBeenCalledOnce();
	});

	it('clicking Back fires onBack', async () => {
		const user = userEvent.setup();
		const { onBack } = setup('vote');
		await user.click(screen.getByRole('button', { name: /back to previous phase/i }));
		expect(onBack).toHaveBeenCalledOnce();
	});
});
