<script lang="ts">
	import type { Snippet } from 'svelte';
	import { tooltip as tooltipAction } from './tooltip';

	/**
	 * Shared shell for header status badges (Collect "I'm done", Vote budget,
	 * Vote "Done voting!"). Owns the pill shape, the done-state success colors,
	 * and the idle pulse animation. Consumers fill in the inner content
	 * (icon + label) and decide whether the badge is interactive (button) or
	 * read-only (span) by providing an `onClick` handler or not.
	 *
	 * The pulse is automatically suppressed when `done` is true — a completed
	 * badge has nothing left to nudge toward.
	 */
	type Props = {
		done: boolean;
		idle?: boolean;
		onClick?: () => void;
		ariaLabel?: string;
		tooltip?: string;
		children: Snippet;
	};

	let {
		done,
		idle = false,
		onClick,
		ariaLabel,
		tooltip: tip,
		children
	}: Props = $props();

	const pulse = $derived(idle && !done);
</script>

{#if onClick}
	<button
		type="button"
		class="status-badge"
		class:done
		class:pulse
		aria-pressed={done}
		aria-label={ariaLabel}
		onclick={onClick}
		use:tooltipAction={tip}
	>
		{@render children()}
	</button>
{:else}
	<span class="status-badge" class:done class:pulse aria-label={ariaLabel}>
		{@render children()}
	</span>
{/if}

<style>
	.status-badge {
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
	}

	button.status-badge {
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}

	button.status-badge:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	button.status-badge:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.status-badge.done {
		border-color: var(--color-success);
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	button.status-badge.done:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	.status-badge :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	.status-badge.pulse {
		animation: status-badge-heartbeat 3.75s ease-in-out infinite;
	}

	/* Two quick pulses ("ba-bump") in the first ~18% of the cycle, then rest
	   for the remainder. */
	@keyframes status-badge-heartbeat {
		0%,
		18%,
		100% {
			transform: scale(1);
			box-shadow: 0 0 0 0 var(--color-primary-soft);
		}
		4% {
			transform: scale(1.03);
			box-shadow: 0 0 0 5px var(--color-primary-soft);
		}
		7% {
			transform: scale(1);
			box-shadow: 0 0 0 0 var(--color-primary-soft);
		}
		11% {
			transform: scale(1.03);
			box-shadow: 0 0 0 5px var(--color-primary-soft);
		}
		14% {
			transform: scale(1);
			box-shadow: 0 0 0 0 var(--color-primary-soft);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.status-badge.pulse {
			animation: none;
		}
	}
</style>
