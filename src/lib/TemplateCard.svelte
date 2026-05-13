<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardSurface from './CardSurface.svelte';

	type Props = {
		selected?: boolean;
		variant?: 'solid' | 'dashed';
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	};

	let { selected = false, variant = 'solid', ariaLabel, onclick, children }: Props = $props();

	const composedClass = $derived(
		['template-card', selected && 'is-selected', variant === 'dashed' && 'template-card-dashed']
			.filter(Boolean)
			.join(' ')
	);
</script>

<CardSurface {variant} {ariaLabel} ariaPressed={selected} {onclick} class={composedClass}>
	{@render children()}
</CardSurface>

<style>
	/* Layout for the template-card surface. `:global` reaches the CardSurface
	   root that this component renders; the `.template-card` class is added
	   by this component, so the selector can only match cards we own. */
	:global(.template-card) {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		text-align: left;
	}

	:global(.template-card.template-card-dashed) {
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-2);
	}

	:global(.template-card-dashed svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}

	/* Selected-state highlight. Suppresses hover lift/shadow when selected. */
	:global(.template-card.is-selected),
	:global(.template-card.is-selected:hover:not(:disabled)) {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
		transform: none;
	}

	/* Content children that consumers pass via the snippet. The class contract:
	   .template-name for the label, .template-cols for the chip row, .col-chip
	   for each column chip. */
	:global(.template-card .template-name) {
		font-weight: 600;
		font-size: var(--font-size-md);
		line-height: 1.3;
	}

	:global(.template-card .template-cols) {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	:global(.template-card .col-chip) {
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-soft);
		color: var(--color-muted);
		border-radius: 1rem;
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	:global(.template-card.is-selected .col-chip) {
		background: white;
		color: var(--color-text);
	}
</style>
