<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { PHASE_ORDER, type Phase } from './room';
	import { tooltip } from './tooltip';

	type Props = {
		phase: Phase;
		onAdvance: () => void;
		onBack: () => void;
	};

	let { phase, onAdvance, onBack }: Props = $props();

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
		use:tooltip={isAtStart ? undefined : backTooltip}
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
		onclick={onAdvance}
		disabled={isClosed}
		aria-label={advanceTooltip}
		use:tooltip={isClosed ? undefined : advanceTooltip}
	>
		<ChevronRight />
	</button>
</div>

<style>
	.phase-controls {
		display: inline-flex;
		align-items: center;
		/* A lot of reused spacing values. Should be pulled into theme */
		gap: 0.5rem;
	}

	.phase {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		padding: 0 0.5rem;
		line-height: 1.1;
	}

	.label {
		/* Fonts should also be part of theme */
		font-weight: 600;
		font-size: 0.875rem;
	}

	.count {
		font-size: 0.6875rem;
		color: var(--color-muted);
	}

	button.step {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
		font-size: 0.875rem;
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
		width: 1rem;
		height: 1rem;
	}
</style>
