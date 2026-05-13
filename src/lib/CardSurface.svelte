<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		variant?: 'solid' | 'dashed';
		disabled?: boolean;
		ariaLabel?: string;
		ariaPressed?: boolean;
		onclick?: (event: MouseEvent) => void;
		/** Pass-through inline style — used by consumers to override --card-accent. */
		style?: string;
		/** Extra class(es) on the root for consumer state hooks. */
		class?: string;
		children: Snippet;
	};

	let {
		variant = 'solid',
		disabled = false,
		ariaLabel,
		ariaPressed,
		onclick,
		style,
		class: klass = '',
		children
	}: Props = $props();
</script>

<button
	type="button"
	class="card-surface {variant} {klass}"
	{disabled}
	aria-label={ariaLabel}
	aria-pressed={ariaPressed}
	{style}
	{onclick}
>
	{@render children()}
</button>

<style>
	.card-surface {
		background: var(--color-surface);
		border: var(--card-border-width) solid var(--color-border-strong);
		border-radius: var(--card-radius);
		box-shadow: var(--card-shadow-rest);
		color: inherit;
		text-align: left;
		font: inherit;
		cursor: pointer;
		padding: 0;
		transition: var(--card-transition);
	}

	.card-surface.dashed {
		border-style: dashed;
		color: var(--color-muted);
	}

	.card-surface:hover:not(:disabled) {
		border-color: var(--card-accent);
		box-shadow: var(--card-shadow-hover);
		transform: translateY(var(--card-lift));
	}

	.card-surface.dashed:hover:not(:disabled) {
		color: var(--card-accent);
	}

	.card-surface:focus-visible {
		outline: none;
		border-color: var(--card-accent);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	.card-surface.dashed:focus-visible {
		color: var(--card-accent);
	}

	.card-surface:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: var(--card-shadow-rest);
	}

	.card-surface:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.card-surface:hover:not(:disabled),
		.card-surface:active:not(:disabled) {
			transform: none;
		}
	}
</style>
