<script lang="ts">
	import InfinityIcon from 'lucide-svelte/icons/infinity';
	import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
	import { tooltip } from './tooltip';

	type Props = {
		remaining: number;
		total: number;
		unlimited: boolean;
		done: boolean;
		onToggleDone: () => void;
	};

	let { remaining, total, unlimited, done, onToggleDone }: Props = $props();
</script>

<button
	type="button"
	class="budget"
	class:done
	aria-pressed={done}
	aria-label="Votes remaining"
	onclick={onToggleDone}
	use:tooltip={done ? 'Click to keep voting' : "Click when you're done voting"}
>
	{#if done}
		<CheckCircle2 />
		<span class="done-label">Done voting!</span>
	{:else if unlimited}
		<span class="numbers"><InfinityIcon /></span>
		<span class="caption">votes — I'm done</span>
	{:else}
		<span class="numbers">{remaining} / {total}</span>
		<span class="caption">votes — I'm done</span>
	{/if}
</button>

<style>
	.budget {
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
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}

	.budget:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.budget:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.numbers {
		display: inline-flex;
		align-items: center;
		font-weight: 600;
	}

	.numbers :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	.caption {
		font-size: var(--font-size-xs);
		color: var(--color-muted);
	}

	.budget:hover .caption {
		color: var(--color-primary);
	}

	.budget.done {
		border-color: var(--color-success);
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.budget.done:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.done-label {
		font-weight: 600;
	}

	.budget :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}
</style>
