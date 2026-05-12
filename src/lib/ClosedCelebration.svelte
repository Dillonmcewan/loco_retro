<script lang="ts">
	import type { Phase } from '$lib/room';
	import RocketShow from '$lib/celebrations/RocketShow.svelte';
	import DiscoShow from '$lib/celebrations/DiscoShow.svelte';

	type Variant = 'rocket' | 'disco';

	let { phase }: { phase: Phase } = $props();

	const TOTAL_MS = 6500;

	let prevPhase: Phase | undefined;
	let playing = $state<Variant | null>(null);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	// Mirror the $effect.pre transition pattern used by RetroCard (lines 43-52).
	// Skip the very first observation so refreshing into an already-closed room
	// doesn't replay the celebration.
	$effect.pre(() => {
		const current = phase;
		if (prevPhase !== undefined && prevPhase !== 'closed' && current === 'closed') {
			playing = pickVariant();
			if (dismissTimer) clearTimeout(dismissTimer);
			dismissTimer = setTimeout(() => {
				playing = null;
				dismissTimer = null;
			}, TOTAL_MS);
		}
		prevPhase = current;
	});

	function pickVariant(): Variant {
		if (typeof window !== 'undefined') {
			const override = new URLSearchParams(window.location.search).get('celebration');
			if (override === 'rocket' || override === 'disco') return override;
		}
		return Math.random() < 0.5 ? 'rocket' : 'disco';
	}

	function dismiss() {
		if (dismissTimer) {
			clearTimeout(dismissTimer);
			dismissTimer = null;
		}
		playing = null;
	}
</script>

{#if playing}
	<div class="celebration">
		<button
			type="button"
			class="dismiss-backdrop"
			onclick={dismiss}
			aria-label="Dismiss celebration"
		></button>
		{#if playing === 'rocket'}
			<RocketShow />
		{:else}
			<DiscoShow />
		{/if}
		<div class="reduced-banner" aria-hidden="true">Mission Accomplished!</div>
		<div class="sr-only" role="status" aria-live="polite">Retro closed</div>
	</div>
{/if}

<style>
	.celebration {
		position: fixed;
		inset: 0;
		z-index: 1100;
		pointer-events: none;
	}

	.dismiss-backdrop {
		position: absolute;
		inset: 0;
		background: transparent;
		border: 0;
		padding: 0;
		margin: 0;
		cursor: pointer;
		pointer-events: auto;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Reduced-motion fallback: hide both animated variants and show a single
	   static banner that fades in. Matches the per-component pattern used at
	   RetroCard.svelte:482-492, PhaseControls.svelte:149-153, +page.svelte:524-528. */
	.reduced-banner {
		position: absolute;
		inset: 0;
		display: none;
		align-items: center;
		justify-content: center;
		font-size: clamp(2rem, 6vw, 4.5rem);
		font-weight: 800;
		color: var(--color-text);
	}

	@media (prefers-reduced-motion: reduce) {
		.celebration :global(.rocket-show),
		.celebration :global(.disco-show) {
			display: none;
		}
		.reduced-banner {
			display: flex;
			animation: reduced-fade 400ms ease-out forwards;
		}
	}

	@keyframes reduced-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
