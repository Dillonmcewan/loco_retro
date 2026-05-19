<script lang="ts">
	import Circle from '@lucide/svelte/icons/circle';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import StatusBadge from './StatusBadge.svelte';

	type Props = {
		ready: boolean;
		onToggle: () => void;
		idle?: boolean;
	};

	let { ready, onToggle, idle = false }: Props = $props();
</script>

<StatusBadge
	done={ready}
	{idle}
	onClick={onToggle}
	tooltip={ready ? 'Click to keep adding cards' : 'Mark yourself done adding cards'}
>
	{#if ready}
		<CheckCircle2 />
		<span class="label">Done adding cards</span>
	{:else}
		<Circle />
		<span class="label">I'm done</span>
	{/if}
</StatusBadge>

<style>
	.label {
		font-weight: 600;
	}
</style>
