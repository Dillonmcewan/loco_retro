<script lang="ts">
	import { goto } from '$app/navigation';
	import Download from 'lucide-svelte/icons/download';
	import Home from 'lucide-svelte/icons/home';
	import X from 'lucide-svelte/icons/x';

	type Props = {
		open: boolean;
		onClose: () => void;
		onExport: () => void;
	};

	let { open, onClose, onExport }: Props = $props();

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

	function handleExport() {
		onExport();
	}

	function handleDashboard() {
		goto('/');
	}
</script>

<dialog bind:this={dialogEl} onclose={handleClose} aria-labelledby="closed-cta-title">
	<div class="content">
		<button type="button" class="close" aria-label="Close" onclick={() => dialogEl?.close()}>
			<X />
		</button>

		<h2 id="closed-cta-title">Nice retro.</h2>
		<p class="subtext">Save it for next time, or head back to your dashboard.</p>

		<div class="actions">
			<button type="button" class="primary" onclick={handleExport}>
				<Download />
				<span>Export retro</span>
			</button>
			<button type="button" class="secondary" onclick={handleDashboard}>
				<Home />
				<span>Back to dashboard</span>
			</button>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(32rem, 100vw - var(--space-8));
		width: 100%;
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
		gap: var(--space-4);
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

	h2 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.subtext {
		margin: 0;
		color: var(--color-text);
		font-size: var(--font-size-md);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	.actions button {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-5);
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--font-size-md);
		cursor: pointer;
		border: 1px solid transparent;
	}

	.actions button.primary {
		background: var(--color-primary);
		color: white;
		border-color: var(--color-primary);
	}

	.actions button.primary:hover {
		background: var(--color-primary-hover);
	}

	.actions button.secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border-color: var(--color-border-strong);
	}

	.actions button.secondary:hover {
		background: var(--color-surface-soft);
	}

	@media (max-width: 32rem) {
		.actions {
			flex-direction: column;
		}
	}
</style>
