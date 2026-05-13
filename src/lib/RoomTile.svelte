<script lang="ts">
	import { goto } from '$app/navigation';
	import Edit3 from 'lucide-svelte/icons/edit-3';
	import ThumbsUp from 'lucide-svelte/icons/thumbs-up';
	import MessageSquare from 'lucide-svelte/icons/message-square';
	import Check from 'lucide-svelte/icons/check';
	import CardSurface from '$lib/CardSurface.svelte';
	import { deriveTemplateLabel } from '$lib/templates';
	import { formatRelative, type RoomIndexEntry } from '$lib/rooms';
	import type { Phase } from '$lib/room';

	type Props = { entry: RoomIndexEntry };
	let { entry }: Props = $props();

	const templateLabel = $derived(
		entry.templateName?.trim() || deriveTemplateLabel(entry.columnTitles)
	);
	const relative = $derived(formatRelative(entry.lastOpenedAt));
	const phase: Phase = $derived(entry.phase ?? 'collect');

	const PHASE_LABEL: Record<Phase, string> = {
		collect: 'Collect',
		vote: 'Vote',
		discuss: 'Discuss',
		closed: 'Closed'
	};

	const phaseAccentStyle = $derived(`--card-accent: var(--color-phase-${phase})`);

	function open() {
		goto(`/r/${entry.id}`);
	}
</script>

<CardSurface
	ariaLabel={`Open retro: ${entry.name}`}
	onclick={open}
	style={phaseAccentStyle}
	class="room-tile"
>
	<span class="stripe" aria-hidden="true"></span>
	<span class="body">
		<span class="name">{entry.name}</span>
		<span class="template">
			<span class="phase-icon" aria-hidden="true">
				{#if phase === 'collect'}<Edit3 />{:else if phase === 'vote'}<ThumbsUp
					/>{:else if phase === 'discuss'}<MessageSquare />{:else}<Check />{/if}
			</span>
			<span class="phase-label">{PHASE_LABEL[phase]}</span>
			<span class="dot" aria-hidden="true">·</span>
			<span class="template-label">{templateLabel}</span>
		</span>
		<span class="time">{relative}</span>
	</span>
</CardSurface>

<style>
	:global(.room-tile) {
		position: relative;
		display: flex;
		min-height: 8rem;
		color: var(--color-text);
		overflow: hidden;
	}

	.stripe {
		flex: none;
		width: 6px;
		background: var(--card-accent);
	}

	.body {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-5);
		min-width: 0;
	}

	.name {
		font-weight: 600;
		font-size: var(--font-size-md);
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.template {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		font-size: var(--font-size-sm);
		color: var(--color-muted);
		min-width: 0;
	}

	.phase-icon {
		display: inline-flex;
		align-items: center;
		color: var(--card-accent);
	}

	.phase-icon :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	.phase-label {
		font-weight: 600;
		color: var(--color-text);
	}

	.dot {
		opacity: 0.5;
	}

	.template-label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.time {
		margin-top: auto;
		font-size: var(--font-size-xs);
		color: var(--color-muted);
		font-weight: 500;
	}
</style>
