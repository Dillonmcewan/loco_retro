import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';

import ClosedCelebrationCTA from './ClosedCelebrationCTA.svelte';

const gotoMock = vi.fn();
vi.mock('$app/navigation', () => ({
	goto: (...args: unknown[]) => gotoMock(...args)
}));

describe('ClosedCelebrationCTA', () => {
	it('does not open the dialog when open=false', () => {
		render(ClosedCelebrationCTA, {
			open: false,
			onClose: vi.fn(),
			onExport: vi.fn()
		});
		const dlg = document.querySelector('dialog');
		expect(dlg?.hasAttribute('open')).toBe(false);
	});

	it('opens the dialog and shows the heading when open=true', async () => {
		render(ClosedCelebrationCTA, {
			open: true,
			onClose: vi.fn(),
			onExport: vi.fn()
		});
		await tick();
		const dlg = document.querySelector('dialog');
		expect(dlg?.hasAttribute('open')).toBe(true);
		expect(screen.getByRole('heading', { name: /nice retro/i })).toBeInTheDocument();
	});

	it('calls close when open flips back to false', async () => {
		const { rerender } = render(ClosedCelebrationCTA, {
			open: true,
			onClose: vi.fn(),
			onExport: vi.fn()
		});
		await tick();
		const dlg = document.querySelector('dialog')!;
		expect(dlg.hasAttribute('open')).toBe(true);

		await rerender({ open: false, onClose: vi.fn(), onExport: vi.fn() });
		await tick();
		expect(dlg.hasAttribute('open')).toBe(false);
	});

	it('clicking "Export retro" fires onExport and not onClose', async () => {
		const user = userEvent.setup();
		const onExport = vi.fn();
		const onClose = vi.fn();
		render(ClosedCelebrationCTA, { open: true, onClose, onExport });
		await tick();

		await user.click(screen.getByRole('button', { name: /export retro/i }));
		expect(onExport).toHaveBeenCalledTimes(1);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('clicking "Back to dashboard" navigates to "/" and does not fire onClose', async () => {
		gotoMock.mockClear();
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(ClosedCelebrationCTA, { open: true, onClose, onExport: vi.fn() });
		await tick();

		await user.click(screen.getByRole('button', { name: /back to dashboard/i }));
		expect(gotoMock).toHaveBeenCalledWith('/');
		expect(onClose).not.toHaveBeenCalled();
	});

	it('clicking the X close button fires onClose via the dialog close event', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(ClosedCelebrationCTA, { open: true, onClose, onExport: vi.fn() });
		await tick();

		await user.click(screen.getByRole('button', { name: /^close$/i }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
