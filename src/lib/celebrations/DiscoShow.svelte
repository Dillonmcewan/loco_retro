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

	// Generate the mirror facets: small diamonds laid out in a brick-offset
	// grid (every other row shifted by half a step) and clipped to the sphere.
	// Each tile gets a random brightness so the surface reads as variegated
	// mirror reflections rather than a uniform pattern. The whole group spins
	// while the shading layer above it stays fixed, giving the impression of
	// a real ball turning under a fixed light source.
	type Facet = { cx: number; cy: number; size: number; brightness: number };
	const FACETS: Facet[] = (() => {
		const out: Facet[] = [];
		const STEP = 7.5;
		const FACET_SIZE = 5;
		const RADIUS = 46;
		let row = 0;
		for (let cy = 3; cy <= 97; cy += STEP) {
			const offsetX = row % 2 === 0 ? 0 : STEP / 2;
			for (let cx = 3 + offsetX; cx <= 97; cx += STEP) {
				const dx = cx - 50;
				const dy = cy - 50;
				if (Math.sqrt(dx * dx + dy * dy) > RADIUS - FACET_SIZE / 2) continue;
				out.push({
					cx,
					cy,
					size: FACET_SIZE,
					brightness: 0.32 + Math.random() * 0.6
				});
			}
			row += 1;
		}
		return out;
	})();

	// A few twinkle sparks scattered in the bright upper-left region. They
	// flash on a stagger so the ball always has something catching the light.
	type Twinkle = { cx: number; cy: number; delayMs: number };
	const TWINKLES: Twinkle[] = [
		{ cx: 28, cy: 26, delayMs: 0 },
		{ cx: 42, cy: 21, delayMs: 250 },
		{ cx: 24, cy: 40, delayMs: 500 },
		{ cx: 50, cy: 30, delayMs: 750 },
		{ cx: 37, cy: 45, delayMs: 1000 }
	];
</script>

<div class="disco-show celebration-variant" aria-hidden="true">
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
			<svg viewBox="0 0 100 100" width="140" height="140" aria-hidden="true">
				<defs>
					<radialGradient id="ball-base" cx="35%" cy="30%" r="68%">
						<stop offset="0%" stop-color="#ede5f7" />
						<stop offset="55%" stop-color="#7a7090" />
						<stop offset="100%" stop-color="#1f1a2a" />
					</radialGradient>
					<radialGradient id="ball-vignette" cx="35%" cy="30%" r="62%">
						<stop offset="55%" stop-color="rgba(0,0,0,0)" />
						<stop offset="100%" stop-color="rgba(12,8,22,0.78)" />
					</radialGradient>
					<clipPath id="ball-clip">
						<circle cx="50" cy="50" r="46" />
					</clipPath>
				</defs>

				<!-- Sphere body — radial gradient handles the base 3D shading. -->
				<circle cx="50" cy="50" r="46" fill="url(#ball-base)" />

				<!-- Mirror facets — this group spins; everything below it stays put. -->
				<g class="ball-facets" clip-path="url(#ball-clip)">
					{#each FACETS as f, i (i)}
						<rect
							x={f.cx - f.size / 2}
							y={f.cy - f.size / 2}
							width={f.size}
							height={f.size}
							fill="#ffffff"
							opacity={f.brightness}
							transform="rotate(45 {f.cx} {f.cy})"
						/>
					{/each}
				</g>

				<!-- Vignette overlay: darkens the edges over the spinning facets so
				     the ball reads as a 3D sphere rather than a flat disc. -->
				<circle cx="50" cy="50" r="46" fill="url(#ball-vignette)" />

				<!-- Specular highlight — fixed in space (light source is upper-left). -->
				<ellipse cx="34" cy="28" rx="11" ry="6.5" fill="#ffffff" opacity="0.42" />
				<ellipse cx="31" cy="25" rx="4.5" ry="2.8" fill="#ffffff" opacity="0.92" />

				<!-- Twinkle sparks — random flashes around the bright region. -->
				{#each TWINKLES as t, i (i)}
					<circle
						class="twinkle"
						cx={t.cx}
						cy={t.cy}
						r="1.6"
						fill="#ffffff"
						style:--delay="{t.delayMs}ms"
					/>
				{/each}
			</svg>
		</div>
	</div>

	<div class="banner-wrap">
		<div class="banner">Party Time!</div>
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
		/* drop-shadow follows the painted SVG circle, not the wrapper's
		   rectangle, so the outer glow stays round. */
		filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.55))
			drop-shadow(0 0 26px rgba(180, 160, 220, 0.4));
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

	/* The mirror-facet <g> spins inside the static sphere. transform-box:
	   view-box pivots around viewBox coords so the center is exactly (50,50). */
	.ball-facets {
		transform-box: view-box;
		transform-origin: 50px 50px;
		animation: ball-spin 2400ms linear infinite;
	}

	@keyframes ball-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.twinkle {
		opacity: 0;
		animation: twinkle-flash 1500ms ease-in-out var(--delay, 0ms) infinite;
	}

	@keyframes twinkle-flash {
		0%,
		70%,
		100% {
			opacity: 0;
		}
		15%,
		35% {
			opacity: 1;
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
		font-size: clamp(3rem, 9vw, 7rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		color: #fbf7f0;
		transform: scale(0);
		opacity: 0;
		animation:
			banner-pop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) 800ms forwards,
			banner-pulse 600ms ease-in-out 1500ms infinite,
			banner-rainbow 2400ms linear 800ms infinite,
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
		}
		50% {
			transform: scale(1.06);
		}
	}

	/* Cycles the text through the vibrant sparkle palette so it reads as a
	   pulsing rainbow. Linear timing keeps the colors flowing at a steady
	   party clip rather than easing into and out of each stop. */
	@keyframes banner-rainbow {
		0%,
		100% {
			color: #ff3ec9;
		}
		20% {
			color: #ffd84a;
		}
		40% {
			color: #36e6d4;
		}
		60% {
			color: #5d8aff;
		}
		80% {
			color: #a4ff4d;
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
