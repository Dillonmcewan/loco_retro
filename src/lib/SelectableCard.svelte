<script lang="ts">
	import type { Snippet } from 'svelte';
	import CardSurface from './CardSurface.svelte';

	type Props = {
		selected: boolean;
		variant?: 'solid' | 'dashed';
		disabled?: boolean;
		ariaLabel?: string;
		onclick?: (event: MouseEvent) => void;
		class?: string;
		children: Snippet;
	};

	let {
		selected,
		variant = 'solid',
		disabled = false,
		ariaLabel,
		onclick,
		class: klass = '',
		children
	}: Props = $props();

	const composedClass = $derived(
		['selectable-card', selected && 'is-selected', klass].filter(Boolean).join(' ')
	);
</script>

<CardSurface
	{variant}
	{disabled}
	{ariaLabel}
	ariaPressed={selected}
	{onclick}
	class={composedClass}
>
	{@render children()}
</CardSurface>

<style>
	/* Selected highlight on the CardSurface root. `:global` lets us reach across
	   the component boundary; scoped to .selectable-card.is-selected so it
	   can't leak to other CardSurface consumers. */
	:global(.selectable-card.is-selected) {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	/* Selected cards are static — hover does not lift, change shadow, or shift colors. */
	:global(.selectable-card.is-selected:hover:not(:disabled)) {
		background: var(--color-primary-soft);
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
		transform: none;
	}
</style>
