import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';

import Modal from './Modal.svelte';

const body = createRawSnippet(() => ({
	render: () => `<div><h2 id="modal-title">Hello</h2><p class="inner">Body</p></div>`
}));

describe('Modal', () => {
	it('opens the dialog when open flips to true and closes when it flips back', async () => {
		const { rerender } = render(Modal, {
			open: false,
			onClose: vi.fn(),
			labelledBy: 'modal-title',
			children: body
		});
		const dlg = document.querySelector('dialog')!;
		expect(dlg.hasAttribute('open')).toBe(false);

		await rerender({ open: true, onClose: vi.fn(), labelledBy: 'modal-title', children: body });
		await tick();
		expect(dlg.hasAttribute('open')).toBe(true);

		await rerender({ open: false, onClose: vi.fn(), labelledBy: 'modal-title', children: body });
		await tick();
		expect(dlg.hasAttribute('open')).toBe(false);
	});

	it('fires onClose when the dialog emits close (ESC / programmatic close)', async () => {
		const onClose = vi.fn();
		render(Modal, { open: true, onClose, labelledBy: 'modal-title', children: body });
		await tick();
		const dlg = document.querySelector('dialog')!;
		dlg.close();
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does not dismiss on backdrop click when dismissOnBackdrop=false', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(Modal, {
			open: true,
			onClose,
			labelledBy: 'modal-title',
			dismissOnBackdrop: false,
			children: body
		});
		await tick();
		const dlg = document.querySelector('dialog')!;
		await user.click(dlg);
		expect(dlg.hasAttribute('open')).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('dismisses on backdrop click when dismissOnBackdrop=true', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(Modal, {
			open: true,
			onClose,
			labelledBy: 'modal-title',
			dismissOnBackdrop: true,
			children: body
		});
		await tick();
		const dlg = document.querySelector('dialog')!;
		await user.click(dlg);
		expect(dlg.hasAttribute('open')).toBe(false);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('does NOT dismiss when clicking inside .content even with dismissOnBackdrop=true', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(Modal, {
			open: true,
			onClose,
			labelledBy: 'modal-title',
			dismissOnBackdrop: true,
			children: body
		});
		await tick();
		const inner = document.querySelector('.inner')!;
		await user.click(inner);
		expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('renders a Close button when showCloseButton=true and it dismisses the dialog', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(Modal, {
			open: true,
			onClose,
			labelledBy: 'modal-title',
			showCloseButton: true,
			children: body
		});
		await tick();
		const closeBtn = screen.getByRole('button', { name: /^close$/i });
		await user.click(closeBtn);
		expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(false);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('omits the Close button by default', async () => {
		render(Modal, {
			open: true,
			onClose: vi.fn(),
			labelledBy: 'modal-title',
			children: body
		});
		await tick();
		expect(screen.queryByRole('button', { name: /^close$/i })).toBeNull();
	});
});
