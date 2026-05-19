<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Modal from '$lib/Modal.svelte';
	import Download from '@lucide/svelte/icons/download';
	import Home from '@lucide/svelte/icons/home';

	type Props = {
		open: boolean;
		onClose: () => void;
		onExport: () => void;
	};

	let { open, onClose, onExport }: Props = $props();

	function handleDashboard() {
		goto(resolve('/'));
	}
</script>

<Modal
	{open}
	{onClose}
	labelledBy="closed-cta-title"
	maxWidth="32rem"
	dismissOnBackdrop
	showCloseButton
>
	{#snippet children(_)}
		<h2 id="closed-cta-title">Great work!</h2>
		<p class="subtext">Export your retro for analysis, or head back to your dashboard.</p>

		<div class="actions">
			<button type="button" class="primary" onclick={onExport}>
				<Download />
				<span>Export retro</span>
			</button>
			<button type="button" class="secondary" onclick={handleDashboard}>
				<Home />
				<span>Dashboard</span>
			</button>
		</div>
	{/snippet}
</Modal>

<style>
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
