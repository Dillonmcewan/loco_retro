<script lang="ts">
	import type { Phase } from '$lib/room';
	import { celebrationFor, celebrationById, type Celebration } from '$lib/celebrations';

	let { phase, roomId }: { phase: Phase; roomId: string } = $props();

	const TOTAL_MS = 6500;

	let prevPhase: Phase | undefined;
	let playing = $state<Celebration | null>(null);
	let dismissTimer: ReturnType<typeof setTimeout> | null = null;

	// Mirror the $effect.pre transition pattern used by RetroCard (lines 43-52).
	// Skip the very first observation so refreshing into an already-closed room
	// doesn't replay the celebration.
	$effect.pre(() => {
		const current = phase;
		if (prevPhase !== undefined && prevPhase !== 'closed' && current === 'closed') {
			playing = pickCelebration();
			if (dismissTimer) clearTimeout(dismissTimer);
			dismissTimer = setTimeout(() => {
				playing = null;
				dismissTimer = null;
			}, TOTAL_MS);
		}
		prevPhase = current;
	});

	// Default pick is deterministic per roomId (same retro always lands on the
	// same celebration). `?celebration=<id>` overrides for deliberate testing.
	function pickCelebration(): Celebration {
		if (typeof window !== 'undefined') {
			const override = new URLSearchParams(window.location.search).get('celebration');
			const overridden = celebrationById(override);
			if (overridden) return overridden;
		}
		return celebrationFor(roomId);
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
	{@const Variant = playing.Show}
	<div class="celebration">
		<div class="gray-bg" aria-hidden="true"></div>
		<button
			type="button"
			class="dismiss-backdrop"
			onclick={dismiss}
			aria-label="Dismiss celebration"
		></button>
		<Variant />
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

	/* Opaque warm-charcoal slab that fully covers the room UI for the duration
	   of the show. Fades in at the start and out just before the orchestrator
	   dismisses (TOTAL_MS = 6500ms). */
	.gray-bg {
		position: absolute;
		inset: 0;
		background: #3a3733;
		opacity: 0;
		pointer-events: none;
		animation:
			gray-bg-in 250ms ease-out forwards,
			gray-bg-out 600ms ease-in 5900ms forwards;
	}

	@keyframes gray-bg-in {
		to {
			opacity: 0.75;
		}
	}

	@keyframes gray-bg-out {
		from {
			opacity: 0.75;
		}
		to {
			opacity: 0;
		}
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
		color: #fbf7f0;
	}

	@media (prefers-reduced-motion: reduce) {
		/* Variant roots opt into the fallback by carrying .celebration-variant. */
		.celebration :global(.celebration-variant) {
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
