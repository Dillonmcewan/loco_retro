<script lang="ts">
	import { goto } from '$app/navigation';
	import { PRESET_TEMPLATES } from '$lib/templates';
	import { formatRelative, type RoomIndexEntry } from '$lib/rooms';

	type Props = { entry: RoomIndexEntry };
	let { entry }: Props = $props();

	const templateLabel = $derived(
		PRESET_TEMPLATES.find((t) => t.id === entry.templateId)?.label ?? entry.templateId
	);
	const relative = $derived(formatRelative(entry.lastOpenedAt));

	function open() {
		goto(`/r/${entry.id}`);
	}
</script>

<button type="button" class="tile" onclick={open} aria-label={`Open retro: ${entry.name}`}>
	<span class="name">{entry.name}</span>
	<span class="template">{templateLabel}</span>
	<span class="time">{relative}</span>
</button>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-5);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card);
		text-align: left;
		cursor: pointer;
		color: var(--color-text);
		min-height: 8rem;
		transition:
			border-color 0.12s ease,
			box-shadow 0.12s ease,
			transform 0.05s ease;
	}

	.tile:hover {
		border-color: var(--color-primary);
		box-shadow: 0 6px 18px -8px rgba(255, 107, 91, 0.25);
		transform: translateY(-1px);
	}

	.tile:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	.tile:active {
		transform: translateY(0);
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
		font-size: var(--font-size-sm);
		color: var(--color-muted);
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.time {
		margin-top: auto;
		font-size: var(--font-size-xs);
		color: var(--color-muted);
		font-weight: 500;
	}
</style>
