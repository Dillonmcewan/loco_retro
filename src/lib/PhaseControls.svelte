<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { PHASE_ORDER, type Phase } from './room';
	import { tooltip } from './tooltip';

	type Props = {
		phase: Phase;
		onAdvance: () => void;
		onBack: () => void;
		advanceReady?: boolean;
	};

	let { phase, onAdvance, onBack, advanceReady = false }: Props = $props();

	const PHASE_LABEL: Record<Phase, string> = {
		collect: 'Collect',
		vote: 'Vote',
		discuss: 'Discuss',
		closed: 'Closed'
	};

	const totalSteps = PHASE_ORDER.length;
	const stepIndex = $derived(PHASE_ORDER.indexOf(phase));
	const stepNumber = $derived(stepIndex + 1);
	const isAtStart = $derived(phase === 'collect');
	const isClosed = $derived(phase === 'closed');

	// Clamp to the ends — at Collect the previous phase is itself, at Closed
	// the next phase is itself. The buttons are disabled in those positions, so
	// these only feed the aria-label / tooltip text.
	const nextIndex = $derived(Math.min(stepIndex + 1, totalSteps - 1));
	const prevIndex = $derived(Math.max(stepIndex - 1, 0));
	const advanceTooltip = $derived(`Advance: ${PHASE_LABEL[PHASE_ORDER[nextIndex]]}`);
	const backTooltip = $derived(`Go back: ${PHASE_LABEL[PHASE_ORDER[prevIndex]]}`);
</script>

<div class="phase-controls" data-phase={phase}>
	<button
		type="button"
		class="step"
		onclick={onBack}
		disabled={isAtStart}
		aria-label={backTooltip}
		use:tooltip={backTooltip}
	>
		<ChevronLeft />
	</button>

	<span class="phase" aria-label="Current phase">
		<span class="label">{PHASE_LABEL[phase]}</span>
		<span class="count">{stepNumber} of {totalSteps}</span>
	</span>

	<button
		type="button"
		class="step advance"
		class:ready={advanceReady && !isClosed}
		onclick={onAdvance}
		disabled={isClosed}
		aria-label={advanceTooltip}
		use:tooltip={advanceTooltip}
	>
		<ChevronRight />
	</button>
</div>

<style>
	.phase-controls {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.phase {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		padding: 0 var(--space-2);
		line-height: 1.1;
	}

	.label {
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.count {
		font-size: var(--font-size-xs);
		color: var(--color-muted);
	}

	button.step {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	button.step:hover:not(:disabled) {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	button.step:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	button.step:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	button.step :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	button.step.advance.ready {
		border-color: var(--color-success);
		background: var(--color-success-soft);
		color: var(--color-success);
		animation: advance-ready-glow 1.8s ease-in-out infinite;
	}

	button.step.advance.ready:hover {
		border-color: var(--color-success);
		color: var(--color-success);
	}

	@keyframes advance-ready-glow {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(31, 122, 77, 0);
		}
		50% {
			box-shadow: 0 0 0 4px rgba(31, 122, 77, 0.18);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		button.step.advance.ready {
			animation: none;
		}
	}
</style>
