<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardSurface from './CardSurface.svelte';

	type Props = {
		/** Omit when the card isn't part of a toggle group — then no aria-pressed is emitted. */
		selected?: boolean;
		variant?: 'solid' | 'dashed';
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	};

	let { selected, variant = 'solid', ariaLabel, onclick, children }: Props = $props();

	const composedClass = $derived(
		['card-selector', selected === true && 'is-selected', variant === 'dashed' && 'is-dashed']
			.filter(Boolean)
			.join(' ')
	);
</script>

<CardSurface {variant} {ariaLabel} ariaPressed={selected} {onclick} class={composedClass}>
	{@render children()}
</CardSurface>

<style>
	/* Layout for the selectable-card surface. `:global` reaches the CardSurface
	   root that this component renders; the `.card-selector` class is added
	   by this component, so the selector can only match cards we own. */
	:global(.card-selector) {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4);
		text-align: left;
		/* Consumers can read this in their own scope (e.g. to recolor an icon
		   on selection) instead of reaching across the boundary with :global. */
		--card-selector-accent: var(--color-muted);
	}

	:global(.card-selector.is-dashed) {
		align-items: center;
		justify-content: center;
		text-align: center;
		gap: var(--space-2);
	}

	:global(.card-selector.is-dashed svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}

	/* Selected-state highlight. Suppresses hover lift/shadow when selected. */
	:global(.card-selector.is-selected),
	:global(.card-selector.is-selected:hover:not(:disabled)) {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
		transform: none;
		--card-selector-accent: var(--color-primary);
	}
</style>
