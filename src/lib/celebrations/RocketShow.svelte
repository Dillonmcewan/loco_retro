<script lang="ts">
	import { onMount } from 'svelte';

	// Vibrant sparkle palette — intentionally separate from the muted brand
	// colors so the exhaust trail reads as electric/glittery rather than blending
	// into the UI.
	const SPARKLE_PALETTE = [
		'#ffd84a', // gold
		'#ffffff', // white
		'#ff3ec9', // hot pink
		'#36e6d4', // cyan
		'#5d8aff', // electric blue
		'#a4ff4d', // lime
		'#ffb02e' // orange
	] as const;

	const RAIN_PALETTE = [
		'var(--color-primary)',
		'var(--color-secondary)',
		'var(--color-tertiary)',
		'var(--color-phase-closed)',
		'var(--color-success)'
	] as const;

	// Rocket flies from (-15vw, 115vh) to (115vw, -15vh) between t=200ms and t=1800ms.
	// Trail particles spawn along that path, each delayed so it appears just as
	// the rocket passes its position.
	const ROCKET_START_MS = 200;
	const ROCKET_DURATION_MS = 1600;

	type TrailShape = 'star' | 'dot' | 'streak';
	const TRAIL_COUNT = 38;
	const TRAIL = Array.from({ length: TRAIL_COUNT }, (_, i) => {
		const progress = i / (TRAIL_COUNT - 1);
		const r = Math.random();
		const shape: TrailShape = r < 0.45 ? 'star' : r < 0.8 ? 'dot' : 'streak';
		return {
			progress,
			delayMs: Math.round(ROCKET_START_MS + ROCKET_DURATION_MS * progress),
			// Perpendicular jitter so the trail looks like spray, not a ruled line.
			jitterX: (Math.random() - 0.5) * 4,
			jitterY: (Math.random() - 0.5) * 4,
			size: shape === 'star' ? 14 + Math.random() * 12 : 6 + Math.random() * 6,
			color: SPARKLE_PALETTE[Math.floor(Math.random() * SPARKLE_PALETTE.length)],
			rotation: Math.round(Math.random() * 360),
			shape
		};
	});

	// Hold the rain back until the rocket is well into its flight and the
	// sparkle trail has had a chance to read on its own. Last spark finishes
	// near 2.75s; rain starts streaming in from 1.4s so there's overlap with
	// the trail tail-end but the exhaust isn't drowned out from the jump.
	const RAIN_START_MS = 1400;
	const RAIN_STAGGER_MS = 1500;
	// Flight path spans 130vw horizontally and 130vh vertically, so its on-screen
	// angle depends on the viewport aspect ratio — not a constant 45°. Compute
	// the rocket rotation from the live viewport so the nose tracks the actual
	// trajectory on any monitor.
	let rocketRotation = $state(45);
	onMount(() => {
		const update = () => {
			const angleAboveHorizontal =
				(Math.atan2(window.innerHeight, window.innerWidth) * 180) / Math.PI;
			// SVG is drawn pointing straight up. CSS rotate is clockwise from up,
			// so to point along a direction that's `angleAboveHorizontal` degrees
			// above horizontal we rotate by (90° − that angle).
			rocketRotation = 90 - angleAboveHorizontal;
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	});

	const RAIN_COUNT = 110;
	const RAIN = Array.from({ length: RAIN_COUNT }, (_, i) => {
		const isPaper = Math.random() < 0.5;
		return {
			left: Math.random() * 100,
			delayMs: Math.round(RAIN_START_MS + Math.random() * RAIN_STAGGER_MS),
			durationMs: Math.round(2400 + Math.random() * 1300),
			driftVw: (Math.random() - 0.5) * 40,
			startRotation: Math.round(Math.random() * 360),
			endRotation: Math.round(Math.random() * 720 - 360),
			color: RAIN_PALETTE[i % RAIN_PALETTE.length],
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
				class="spark spark-{t.shape}"
				style:--progress={t.progress}
				style:--jitter-x="{t.jitterX}vw"
				style:--jitter-y="{t.jitterY}vh"
				style:--delay="{t.delayMs}ms"
				style:--size="{t.size}px"
				style:--rotation="{t.rotation}deg"
				style:--color={t.color}
			></span>
		{/each}
	</div>

	<!-- Inline SVG so the rocket's orientation is deterministic across platforms
	     (emoji 🚀 leans differently on Apple vs Android vs Windows). Drawn
	     pointing up in the viewBox; the inner <g> rotates by the live trajectory
	     angle so the nose tracks the path on any aspect ratio. -->
	<div class="rocket">
		<svg viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
			<g transform="rotate({rocketRotation} 50 50)">
				<!-- nose cone -->
				<path d="M50 6 L66 36 L34 36 Z" fill="#ff5b4a" stroke="#2a2420" stroke-width="2" />
				<!-- body -->
				<rect
					x="34"
					y="34"
					width="32"
					height="44"
					rx="6"
					fill="#f4f1ec"
					stroke="#2a2420"
					stroke-width="2"
				/>
				<!-- window -->
				<circle cx="50" cy="50" r="8" fill="#7fcdff" stroke="#2a2420" stroke-width="2" />
				<circle cx="47" cy="47" r="2.5" fill="#ffffff" opacity="0.85" />
				<!-- fins -->
				<path d="M34 64 L22 84 L34 78 Z" fill="#ff5b4a" stroke="#2a2420" stroke-width="2" />
				<path d="M66 64 L78 84 L66 78 Z" fill="#ff5b4a" stroke="#2a2420" stroke-width="2" />
				<!-- thruster ring -->
				<rect
					x="38"
					y="76"
					width="24"
					height="6"
					rx="2"
					fill="#5a5563"
					stroke="#2a2420"
					stroke-width="2"
				/>
				<!-- flame -->
				<path d="M42 82 Q46 92 50 86 Q54 92 58 82 Q56 96 50 100 Q44 96 42 82 Z" fill="#ffb02e" />
				<path d="M45 84 Q48 90 50 87 Q52 90 55 84 Q53 92 50 95 Q47 92 45 84 Z" fill="#ffec5f" />
			</g>
		</svg>
	</div>

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

	/* SVG is 120×120; negative margin so the translate target hits its center
	   rather than its top-left corner. Orientation is baked into the SVG, so
	   the CSS transform only needs to translate. */
	.rocket {
		position: absolute;
		left: 0;
		top: 0;
		width: 120px;
		height: 120px;
		margin: -60px 0 0 -60px;
		filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.35));
		transform: translate(-15vw, 115vh);
		/* Linear so each spark's delay (computed from the rocket's linear
		   path-progress) actually corresponds to the rocket's on-screen
		   position. An ease-out here would put the rocket way ahead of its
		   trail. */
		animation: rocket-flight 1600ms linear 200ms forwards;
	}

	@keyframes rocket-flight {
		0% {
			transform: translate(-15vw, 115vh);
		}
		100% {
			transform: translate(115vw, -15vh);
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
		color: var(--color);
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.3) rotate(var(--rotation));
		animation: sparkle-twinkle 950ms ease-out var(--delay) forwards;
	}

	/* Four-point CSS star (concave between points) — reads as a "twinkle" shape. */
	.spark-star {
		background: currentColor;
		clip-path: polygon(50% 0%, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0% 50%, 42% 42%);
		filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 14px currentColor);
	}

	.spark-dot {
		background: currentColor;
		border-radius: 50%;
		box-shadow:
			0 0 6px currentColor,
			0 0 14px currentColor,
			0 0 22px currentColor;
	}

	.spark-streak {
		background: linear-gradient(
			90deg,
			transparent,
			currentColor 40%,
			currentColor 60%,
			transparent
		);
		border-radius: 50%;
		box-shadow:
			0 0 8px currentColor,
			0 0 18px currentColor;
		/* streaks are oblong */
		height: calc(var(--size) * 0.3);
	}

	@keyframes sparkle-twinkle {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.3) rotate(var(--rotation));
		}
		6% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.25) rotate(calc(var(--rotation) + 90deg));
		}
		55% {
			opacity: 0.95;
			transform: translate(-50%, -50%) scale(1) rotate(calc(var(--rotation) + 180deg));
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.4) rotate(calc(var(--rotation) + 280deg));
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
