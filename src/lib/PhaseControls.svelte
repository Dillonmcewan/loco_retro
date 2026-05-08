<script lang="ts">
	import ChevronLeft from 'lucide-svelte/icons/chevron-left';
	import ChevronRight from 'lucide-svelte/icons/chevron-right';
	import { PHASE_ORDER, type Phase } from './room';

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

	const stepNumber = $derived(PHASE_ORDER.indexOf(phase) + 1);
	const totalSteps = PHASE_ORDER.length;
	const isAtStart = $derived(phase === 'collect');
	const isClosed = $derived(phase === 'closed');
	const advanceLabel = $derived(phase === 'discuss' ? 'Close room' : 'Advance');
</script>

<div class="phase-controls" data-phase={phase}>
	<button
		type="button"
		class="step"
		onclick={onBack}
		disabled={isAtStart}
		aria-label="Back to previous phase"
	>
		<ChevronLeft />
	</button>

	<span class="pill" aria-label="Current phase">
		<span class="label">{PHASE_LABEL[phase]}</span>
		<span class="count">{stepNumber} of {totalSteps}</span>
	</span>

	{#if !isClosed}
		<button type="button" class="step advance" onclick={onAdvance} aria-label={advanceLabel}>
			<span>{advanceLabel}</span>
			<ChevronRight />
		</button>
	{/if}
</div>

<style>
	.phase-controls {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pill {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		padding: 0.25rem 0.875rem;
		border-radius: 1rem;
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		line-height: 1.1;
	}

	.label {
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
