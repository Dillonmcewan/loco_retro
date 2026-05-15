<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from 'lucide-svelte/icons/x';

	type Props = {
		open: boolean;
		onClose: () => void;
		labelledBy: string;
		/**
		 * When true, clicking the dim backdrop closes the modal. Default false so
		 * form modals don't lose user input on a stray click; opt in explicitly for
		 * decision/info modals.
		 */
		dismissOnBackdrop?: boolean;
		/** CSS length for the dialog cap. Capped further by viewport width. */
		maxWidth?: string;
		/** Adds max-height + overflow on .content so long bodies scroll inside. */
		scrollable?: boolean;
		/** Renders an X button in the corner that calls dialog.close(). */
		showCloseButton?: boolean;
		closeLabel?: string;
		children: Snippet;
	};

	let {
		open,
		onClose,
		labelledBy,
		dismissOnBackdrop = false,
		maxWidth = '34rem',
		scrollable = false,
		showCloseButton = false,
		closeLabel = 'Close',
		children
	}: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (open && !el.open) {
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	});

	function handleClose() {
		onClose();
	}

	// Native <dialog> doesn't dismiss on backdrop click. When opt-in, treat a
	// click whose target is the dialog itself (not anything inside .content) as
	// a backdrop click.
	function handleClick(e: MouseEvent) {
		if (!dismissOnBackdrop) return;
		if (e.target === dialogEl) dialogEl?.close();
	}
</script>

<dialog
	bind:this={dialogEl}
	onclose={handleClose}
	onclick={handleClick}
	aria-labelledby={labelledBy}
	class:scrollable
	style:--modal-max-width={maxWidth}
>
	<div class="content" class:scrollable>
		{#if showCloseButton}
			<button type="button" class="close" aria-label={closeLabel} onclick={() => dialogEl?.close()}>
				<X />
			</button>
		{/if}
		{@render children()}
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(var(--modal-max-width, 34rem), 100vw - var(--space-8));
		width: 100%;
	}

	dialog.scrollable {
		max-height: calc(100vh - var(--space-12));
		overflow: visible;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
	}

	.content {
		position: relative;
		background: var(--color-surface);
		padding: var(--space-8) var(--space-10) var(--space-10);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-card);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.content.scrollable {
		max-height: calc(100vh - var(--space-12));
		overflow-y: auto;
	}

	.close {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		background: transparent;
		border: none;
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.close:hover {
		background: var(--color-surface-soft);
	}
</style>
