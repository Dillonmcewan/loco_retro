<script lang="ts">
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import Sparkles from 'lucide-svelte/icons/sparkles';
	import CardSurface from '$lib/CardSurface.svelte';
	import CreateRoomModal from '$lib/CreateRoomModal.svelte';
	import RoomTile from '$lib/RoomTile.svelte';
	import Wordmark from '$lib/Wordmark.svelte';
	import { listRooms, type RoomIndexEntry } from '$lib/rooms';

	let rooms = $state<RoomIndexEntry[]>([]);
	let modalOpen = $state(false);
	let mounted = $state(false);

	onMount(() => {
		rooms = listRooms();
		mounted = true;
	});

	function openModal() {
		modalOpen = true;
	}

	function closeModal() {
		modalOpen = false;
		rooms = listRooms();
	}

	const isEmpty = $derived(mounted && rooms.length === 0);
</script>

<svelte:head>
	<title>LocoRetro</title>
</svelte:head>

<div class="topbar">
	<Wordmark />
</div>

<main>
	<header>
		<h1>Your retros</h1>
	</header>

	<section class="grid" aria-label="Your retros">
		<CardSurface
			variant="dashed"
			ariaLabel="Create a new retro"
			onclick={openModal}
			class="new-tile"
		>
			<Plus />
			<span class="new-label">New retro</span>
		</CardSurface>

		{#each rooms as entry (entry.id)}
			<RoomTile {entry} />
		{/each}

		{#if isEmpty}
			<div class="placeholder-tile" aria-hidden="true">
				<span class="placeholder-icon"><Sparkles /></span>
				<span class="placeholder-name">Sprint 42 retro</span>
				<span class="placeholder-hint">Your retros will appear here.</span>
			</div>
			<div class="placeholder-tile" aria-hidden="true">
				<span class="placeholder-icon"><Sparkles /></span>
				<span class="placeholder-name">Q4 team retro</span>
				<span class="placeholder-hint">Click + to start your first one.</span>
			</div>
		{/if}
	</section>
</main>

<CreateRoomModal open={modalOpen} onClose={closeModal} />

<style>
	.topbar {
		display: flex;
		align-items: center;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	main {
		max-width: 72rem;
		margin: var(--space-12) auto;
		padding: 0 var(--space-6);
	}

	header {
		margin-bottom: var(--space-8);
	}

	h1 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: var(--space-4);
	}

	:global(.new-tile) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-5);
		min-height: 8rem;
		font-weight: 600;
		font-size: var(--font-size-md);
	}

	:global(.new-tile svg) {
		width: 2rem;
		height: 2rem;
	}

	.new-label {
		font-size: var(--font-size-sm);
	}

	.placeholder-tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-5);
		min-height: 8rem;
		background: transparent;
		border: 1.5px dashed var(--color-border-strong);
		border-radius: var(--radius-md);
		color: var(--color-muted);
		opacity: 0.6;
	}

	.placeholder-icon {
		display: inline-flex;
		color: var(--color-tertiary);
	}

	.placeholder-icon :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.placeholder-name {
		font-weight: 600;
		font-size: var(--font-size-md);
		color: var(--color-text);
		opacity: 0.55;
	}

	.placeholder-hint {
		margin-top: auto;
		font-size: var(--font-size-xs);
	}
</style>
