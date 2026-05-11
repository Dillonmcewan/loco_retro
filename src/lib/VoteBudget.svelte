<script lang="ts">
	type Props = {
		remaining: number;
		total: number;
	};

	let { remaining, total }: Props = $props();

	const depleted = $derived(remaining <= 0);
</script>

<span class="budget" class:depleted aria-label="Votes remaining">
	<span class="numbers">{remaining} / {total}</span>
	<span class="caption">votes remaining</span>
</span>

<style>
	.budget {
		display: inline-flex;
		align-items: baseline;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		font-size: var(--font-size-sm);
	}

	.numbers {
		font-weight: 600;
		color: var(--color-text);
	}

	.caption {
		font-size: var(--font-size-xs);
		color: var(--color-muted);
	}

	.budget.depleted {
		border-color: var(--color-danger);
		background: var(--color-danger-soft);
	}

	.budget.depleted .numbers {
		color: var(--color-danger);
	}
</style>
