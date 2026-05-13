<script lang="ts">
	import Circle from 'lucide-svelte/icons/circle';
	import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
	import { tooltip } from './tooltip';

	type Props = {
		ready: boolean;
		onToggle: () => void;
	};

	let { ready, onToggle }: Props = $props();
</script>

<button
	type="button"
	class="status"
	class:ready
	aria-pressed={ready}
	onclick={onToggle}
	use:tooltip={ready ? 'Click to keep adding cards' : 'Mark yourself done adding cards'}
>
	{#if ready}
		<CheckCircle2 />
		<span>Done adding cards</span>
	{:else}
		<Circle />
		<span>I'm done</span>
	{/if}
</button>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font: inherit;
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}

	.status:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.status:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.status.ready {
		border-color: var(--color-success);
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.status.ready:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.status :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}
</style>
