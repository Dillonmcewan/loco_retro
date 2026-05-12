<script lang="ts">
	// Six sweeping spotlights, each tinted from the existing palette, with
	// staggered start angles and varied rotation speeds so they interlock
	// rather than spinning in lockstep.
	const SPOTLIGHTS = [
		{ color: 'var(--color-primary)', startAngle: 0, durationMs: 3200 },
		{ color: 'var(--color-secondary)', startAngle: 60, durationMs: 4000 },
		{ color: 'var(--color-tertiary)', startAngle: 120, durationMs: 3600 },
		{ color: 'var(--color-phase-closed)', startAngle: 180, durationMs: 4400 },
		{ color: 'var(--color-success)', startAngle: 240, durationMs: 3000 },
		{ color: 'var(--color-primary)', startAngle: 300, durationMs: 5000 }
	] as const;
</script>

<div class="disco-show" aria-hidden="true">
	<div class="ball-anchor">
		{#each SPOTLIGHTS as light, i (i)}
			<div
				class="cone"
				style:--start-angle="{light.startAngle}deg"
				style:--duration="{light.durationMs}ms"
				style:--color={light.color}
			></div>
		{/each}

		<div class="ball">
			<div class="ball-facets"></div>
			<div class="ball-shine"></div>
		</div>
	</div>

	<div class="banner-wrap">
		<div class="banner">Mission Accomplished!</div>
	</div>
</div>

<style>
	.disco-show {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	/* ─── Disco ball anchor (sets coordinate origin for cones + ball) ─────── */

	.ball-anchor {
		position: absolute;
		left: 50%;
		top: 22vh;
		width: 0;
		height: 0;
	}

	/* ─── Spotlight cones ─────────────────────────────────────────────────── */

	.cone {
		position: absolute;
		left: 0;
		top: 0;
		width: 50vw;
		height: 110vh;
		margin-left: -25vw; /* center the cone div horizontally on the anchor */
		transform-origin: 50% 0%; /* pivot at apex (top-center of the cone div) */
		transform: rotate(var(--start-angle));
		clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
		background: linear-gradient(to bottom, var(--color) 0%, transparent 75%);
		opacity: 0;
		mix-blend-mode: screen;
		animation:
			cone-in 600ms ease-out 200ms forwards,
			cone-sweep var(--duration) linear 200ms infinite,
			cone-out 700ms ease-in 5500ms forwards;
	}

	@keyframes cone-in {
		to {
			opacity: 0.7;
		}
	}

	@keyframes cone-out {
		from {
			opacity: 0.7;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes cone-sweep {
		from {
			transform: rotate(var(--start-angle));
		}
		to {
			transform: rotate(calc(var(--start-angle) + 360deg));
		}
	}

	/* ─── Disco ball ──────────────────────────────────────────────────────── */

	.ball {
		position: absolute;
		left: -70px;
		top: -70px;
		width: 140px;
		height: 140px;
		border-radius: 50%;
		background: radial-gradient(
			circle at 32% 30%,
			#f4f3fa 0%,
			#c4c0d8 30%,
			#5b5470 70%,
			#2a253a 100%
		);
		box-shadow:
			0 8px 20px rgba(0, 0, 0, 0.5),
			0 0 60px rgba(180, 160, 220, 0.45);
		overflow: hidden;
		opacity: 0;
		animation:
			ball-in 600ms ease-out forwards,
			ball-bob 3200ms ease-in-out 600ms infinite,
			ball-out 600ms ease-in 5500ms forwards;
	}

	@keyframes ball-in {
		from {
			opacity: 0;
			transform: scale(0.5);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes ball-out {
		to {
			opacity: 0;
			transform: scale(0.7);
		}
	}

	@keyframes ball-bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-7px);
		}
	}

	/* Facets: a grid of small reflective tiles via overlapping conic + linear gradients. */
	.ball-facets {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		background:
			repeating-conic-gradient(
				from 0deg,
				rgba(255, 255, 255, 0.18) 0deg 6deg,
				transparent 6deg 12deg
			),
			repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.15) 0 6px, transparent 6px 12px);
		mix-blend-mode: overlay;
		animation: ball-spin 2400ms linear infinite;
	}

	@keyframes ball-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.ball-shine {
		position: absolute;
		left: 22%;
		top: 18%;
		width: 26%;
		height: 22%;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.85), transparent 70%);
		filter: blur(2px);
	}

	/* ─── Banner ──────────────────────────────────────────────────────────── */

	.banner-wrap {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.banner {
		font-size: clamp(3rem, 9vw, 7rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		color: #fbf7f0;
		transform: scale(0);
		opacity: 0;
		animation:
			banner-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 800ms forwards,
			banner-pulse 600ms ease-in-out 1500ms infinite,
			banner-out 700ms ease-in 5300ms forwards;
		text-align: center;
		white-space: nowrap;
	}

	@keyframes banner-pop {
		0% {
			transform: scale(0) rotate(-3deg);
			opacity: 0;
		}
		100% {
			transform: scale(1) rotate(0deg);
			opacity: 1;
		}
	}

	@keyframes banner-pulse {
		0%,
		100% {
			transform: scale(1);
			filter: hue-rotate(0deg);
		}
		50% {
			transform: scale(1.06);
			filter: hue-rotate(40deg);
		}
	}

	@keyframes banner-out {
		from {
			opacity: 1;
		}
		to {
			transform: scale(0.92);
			opacity: 0;
		}
	}
</style>
