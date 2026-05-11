<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		/** Extra class(es) to attach to the outer article. Useful for hover/state
		 *  selectors in the consumer that need to target the card root. */
		class?: string;
	};

	let { children, class: klass = '' }: Props = $props();
</script>

<article class="card {klass}">
	{@render children()}
</article>

<style>
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3) var(--space-4);
		box-shadow: var(--shadow-card-sm);
	}
</style>
