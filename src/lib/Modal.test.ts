import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import { createRawSnippet } from 'svelte';

import Modal from './Modal.svelte';

const body = createRawSnippet(() => ({
	render: () => `<div><h2 id="modal-title">Hello</h2><p class="inner">Body</p></div>`
}));

// Snippet that renders a Cancel button wired to the close() callback the
// Modal provides to children. Exercises the same path the production
// consumers (ExportModal, CreateRoomModal, TemplatePickerModal) take.
const bodyWithCancel = createRawSnippet((closeArg: () => { close: () => void }) => ({
	render: () => `<div><h2 id="modal-title">Hello</h2><button data-cancel>Cancel</button></div>`,
	setup: (target: Element) => {
		const btn = target.querySelector<HTMLButtonElement>('[data-cancel]')!;
		btn.addEventListener('click', () => closeArg().close());
	}
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

	it('calls onClose exactly once when Cancel routes through the close snippet param', async () => {
		// Regression: Cancel buttons used to call onClose directly, which made the
		// parent flip open=false, which triggered Modal's $effect → el.close() →
		// onclose event → another onClose call. Now Cancel calls close() (which
		// calls dialogEl.close()), and the single onclose event fires onClose
		// exactly once.
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(Modal, {
			open: true,
			onClose,
			labelledBy: 'modal-title',
			children: bodyWithCancel
		});
		await tick();
		await user.click(document.querySelector<HTMLButtonElement>('[data-cancel]')!);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose exactly once on backdrop dismiss', async () => {
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
		await user.click(document.querySelector('dialog')!);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose exactly once when the X close button is clicked', async () => {
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
		await user.click(screen.getByRole('button', { name: /^close$/i }));
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
