<script lang="ts">
	import InfinityIcon from 'lucide-svelte/icons/infinity';
	import CheckCircle2 from 'lucide-svelte/icons/check-circle-2';
	import Circle from 'lucide-svelte/icons/circle';
	import StatusBadge from './StatusBadge.svelte';

	type Props = {
		remaining: number;
		total: number;
		unlimited: boolean;
		done: boolean;
		onToggleDone: () => void;
		idle?: boolean;
	};

	let { remaining, total, unlimited, done, onToggleDone, idle = false }: Props = $props();
</script>

{#if unlimited}
	<StatusBadge
		{done}
		{idle}
		onClick={onToggleDone}
		ariaLabel={done ? 'Mark voting incomplete' : 'Mark voting complete'}
		tooltip={done ? 'Click to keep voting' : "Click when you're done voting"}
	>
		{#if done}
			<CheckCircle2 />
			<span class="done-label">Done voting!</span>
		{:else}
			<Circle />
			<span class="done-label">I'm done</span>
			<span class="separator" aria-hidden="true">·</span>
			<span class="numbers"><InfinityIcon /></span>
			<span class="caption">votes</span>
		{/if}
	</StatusBadge>
{:else}
	<StatusBadge {done} {idle} ariaLabel="Votes remaining">
		{#if done}
			<CheckCircle2 />
			<span class="done-label">Done voting!</span>
		{:else}
			<span class="numbers">{remaining} / {total}</span>
			<span class="caption">votes remaining</span>
		{/if}
	</StatusBadge>
{/if}

<style>
	.numbers {
		display: inline-flex;
		align-items: center;
		font-weight: 600;
	}

	.numbers :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	.caption {
		font-size: var(--font-size-xs);
		color: var(--badge-fg-muted);
	}

	.separator {
		color: var(--badge-fg-muted);
	}

	.done-label {
		font-weight: 600;
	}
</style>
