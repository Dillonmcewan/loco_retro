<script lang="ts">
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { tooltip } from './tooltip';

	type Props = {
		myCount: number;
		canIncrement: boolean;
		onIncrement: () => void;
		onDecrement: () => void;
	};

	let { myCount, canIncrement, onIncrement, onDecrement }: Props = $props();

	const canDecrement = $derived(myCount > 0);
</script>

<div class="vote-controls" aria-label="Your votes on this card">
	<button
		type="button"
		class="step"
		onclick={onDecrement}
		disabled={!canDecrement}
		aria-label="Retract a vote"
		use:tooltip={canDecrement ? 'Retract a vote' : undefined}
	>
		<Minus />
	</button>
	<span class="count" aria-live="polite">{myCount}</span>
	<button
		type="button"
		class="step"
		onclick={onIncrement}
		disabled={!canIncrement}
		aria-label="Cast a vote"
		use:tooltip={canIncrement ? 'Cast a vote' : 'No votes remaining'}
	>
		<Plus />
	</button>
</div>

<style>
	.vote-controls {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.count {
		min-width: 1.5rem;
		text-align: center;
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	button.step {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		line-height: 0;
	}

	button.step:hover:not(:disabled) {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	button.step:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	button.step:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	button.step :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}
</style>
