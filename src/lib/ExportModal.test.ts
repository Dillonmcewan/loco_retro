import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

import ExportModal from './ExportModal.svelte';

describe('ExportModal', () => {
	it('renders the three format cards and an Export button', () => {
		render(ExportModal, { open: true, onClose: vi.fn(), onConfirm: vi.fn() });
		expect(screen.getByRole('heading', { name: /export retro/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^PDF/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^CSV/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Markdown/ })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /^Export$/ })).toBeDisabled();
	});

	it('selecting a card enables Export and marks it pressed', async () => {
		const user = userEvent.setup();
		render(ExportModal, { open: true, onClose: vi.fn(), onConfirm: vi.fn() });
		const csv = screen.getByRole('button', { name: /^CSV/ });
		await user.click(csv);
		expect(csv).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByRole('button', { name: /^Export$/ })).toBeEnabled();
	});

	it('clicking Export fires onConfirm with the chosen format', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();
		render(ExportModal, { open: true, onClose: vi.fn(), onConfirm });
		await user.click(screen.getByRole('button', { name: /^Markdown/ }));
		await user.click(screen.getByRole('button', { name: /^Export$/ }));
		expect(onConfirm).toHaveBeenCalledWith('md');
	});

	it('clicking Cancel triggers onClose without firing onConfirm', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onConfirm = vi.fn();
		render(ExportModal, { open: true, onClose, onConfirm });
		await user.click(screen.getByRole('button', { name: /^Cancel$/ }));
		expect(onClose).toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('does not render in the open state when open=false', () => {
		render(ExportModal, { open: false, onClose: vi.fn(), onConfirm: vi.fn() });
		const dlg = document.querySelector('dialog');
		expect(dlg?.hasAttribute('open')).toBe(false);
	});
});
