<script lang="ts">
	const PALETTE = [
		'var(--color-primary)',
		'var(--color-secondary)',
		'var(--color-tertiary)',
		'var(--color-phase-closed)',
		'var(--color-success)'
	] as const;

	// Rocket flies from (-10vw, 110vh) to (110vw, -10vh) between t=200ms and t=1800ms.
	// Trail particles spawn along that path, each delayed so it appears just as
	// the rocket passes its position.
	const TRAIL_COUNT = 22;
	const ROCKET_START_MS = 200;
	const ROCKET_DURATION_MS = 1600;
	const TRAIL = Array.from({ length: TRAIL_COUNT }, (_, i) => {
		const progress = i / (TRAIL_COUNT - 1);
		return {
			progress,
			delayMs: Math.round(ROCKET_START_MS + ROCKET_DURATION_MS * progress),
			color: PALETTE[i % PALETTE.length],
			// Slight perpendicular jitter so the trail looks like sparks, not a ruler.
			jitterX: (Math.random() - 0.5) * 6,
			jitterY: (Math.random() - 0.5) * 6,
			size: 5 + Math.random() * 4
		};
	});

	const RAIN_COUNT = 110;
	const RAIN = Array.from({ length: RAIN_COUNT }, (_, i) => {
		const isPaper = Math.random() < 0.5;
		return {
			left: Math.random() * 100,
			delayMs: Math.round(Math.random() * 1600),
			durationMs: Math.round(2600 + Math.random() * 1400),
			driftVw: (Math.random() - 0.5) * 40,
			startRotation: Math.round(Math.random() * 360),
			endRotation: Math.round(Math.random() * 720 - 360),
			color: PALETTE[i % PALETTE.length],
			size: isPaper ? 6 + Math.random() * 5 : 4 + Math.random() * 4,
			height: isPaper ? 10 + Math.random() * 6 : 0,
			isPaper
		};
	});
</script>

<div class="rocket-show" aria-hidden="true">
	<div class="brighten"></div>

	<div class="trail-layer">
		{#each TRAIL as t, i (i)}
			<span
				class="spark"
				style:--progress={t.progress}
				style:--jitter-x="{t.jitterX}vw"
				style:--jitter-y="{t.jitterY}vh"
				style:--delay="{t.delayMs}ms"
				style:--size="{t.size}px"
				style:background={t.color}
			></span>
		{/each}
	</div>

	<div class="rocket">🚀</div>

	<div class="rain-layer">
		{#each RAIN as p, i (i)}
			<span
				class="drop"
				class:paper={p.isPaper}
				style:left="{p.left}vw"
				style:--delay="{p.delayMs}ms"
				style:--duration="{p.durationMs}ms"
				style:--drift="{p.driftVw}vw"
				style:--start-rotation="{p.startRotation}deg"
				style:--end-rotation="{p.endRotation}deg"
				style:--size="{p.size}px"
				style:--height="{p.height}px"
				style:background={p.color}
			></span>
		{/each}
	</div>

	<div class="banner-wrap">
		<div class="banner">🎉 Retro complete! 🎉</div>
	</div>
</div>

<style>
	.rocket-show {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}

	/* ─── Screen brighten ─────────────────────────────────────────────────── */

	.brighten {
		position: absolute;
		inset: 0;
		background: #ffffff;
		opacity: 0;
		animation: brighten-pulse 600ms ease-out forwards;
	}

	@keyframes brighten-pulse {
		0% {
			opacity: 0;
		}
		25% {
			opacity: 0.35;
		}
		100% {
			opacity: 0;
		}
	}

	/* ─── Rocket ──────────────────────────────────────────────────────────── */

	.rocket {
		position: absolute;
		left: 0;
		top: 0;
		font-size: 5rem;
		line-height: 1;
		filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
		transform: translate(-15vw, 115vh) rotate(-45deg);
		animation: rocket-flight 1600ms cubic-bezier(0.32, 0.72, 0.4, 1) 200ms forwards;
	}

	@keyframes rocket-flight {
		0% {
			transform: translate(-15vw, 115vh) rotate(-45deg);
		}
		100% {
			transform: translate(115vw, -15vh) rotate(-45deg);
		}
	}

	/* ─── Exhaust trail ───────────────────────────────────────────────────── */

	.trail-layer {
		position: absolute;
		inset: 0;
	}

	.spark {
		position: absolute;
		/* Place at point along rocket's diagonal path, offset by jitter. */
		left: calc(-10vw + var(--progress) * 120vw + var(--jitter-x));
		top: calc(110vh - var(--progress) * 120vh + var(--jitter-y));
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.4);
		animation: spark-pop 900ms ease-out var(--delay) forwards;
		box-shadow: 0 0 8px currentColor;
	}

	@keyframes spark-pop {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.4);
		}
		20% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.6);
		}
	}

	/* ─── Confetti rain ───────────────────────────────────────────────────── */

	.rain-layer {
		position: absolute;
		inset: 0;
	}

	.drop {
		position: absolute;
		top: -10vh;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		opacity: 0;
		animation: rain-fall var(--duration) linear var(--delay) forwards;
	}

	.drop.paper {
		height: var(--height);
		border-radius: 1px;
	}

	@keyframes rain-fall {
		0% {
			transform: translate(0, 0) rotate(var(--start-rotation));
			opacity: 0;
		}
		8% {
			opacity: 1;
		}
		92% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--drift), 130vh) rotate(var(--end-rotation));
			opacity: 0;
		}
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
		font-size: clamp(2.5rem, 7vw, 5.5rem);
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--color-text);
		background: var(--color-surface);
		padding: var(--space-6) var(--space-10);
		border-radius: var(--radius-lg);
		border: 3px solid var(--color-phase-closed);
		box-shadow:
			0 2px 4px rgba(42, 36, 32, 0.1),
			0 24px 60px -12px rgba(42, 36, 32, 0.35);
		transform: scale(0);
		opacity: 0;
		animation:
			banner-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 1000ms forwards,
			banner-out 700ms ease-in 5000ms forwards;
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

	@keyframes banner-out {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(0.92);
			opacity: 0;
		}
	}
</style>
