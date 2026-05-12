<script lang="ts">
	import { onMount } from 'svelte';
	import Plus from 'lucide-svelte/icons/plus';
	import CreateRoomModal from '$lib/CreateRoomModal.svelte';
	import RoomTile from '$lib/RoomTile.svelte';
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
</script>

<main class:empty={mounted && rooms.length === 0}>
	<header>
		<p class="wordmark">loco_retro</p>
		<h1>Your retros</h1>
	</header>

	<section class="grid" aria-label="Your retros">
		<button type="button" class="new-tile" onclick={openModal} aria-label="Create a new retro">
			<Plus />
			<span class="new-label">New retro</span>
		</button>

		{#each rooms as entry (entry.id)}
			<RoomTile {entry} />
		{/each}
	</section>

	{#if mounted && rooms.length === 0}
		<p class="hint">Your retros will show up here once you create or join one.</p>
	{/if}
</main>

<CreateRoomModal open={modalOpen} onClose={closeModal} />

<style>
	main {
		max-width: 72rem;
		margin: var(--space-12) auto;
		padding: 0 var(--space-6);
	}

	main.empty {
		max-width: 36rem;
	}

	header {
		margin-bottom: var(--space-8);
	}

	.wordmark {
		font-weight: 600;
		font-size: var(--font-size-sm);
		letter-spacing: 0.08em;
		text-transform: lowercase;
		color: var(--color-muted);
		margin: 0 0 var(--space-2);
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

	.new-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		padding: var(--space-5);
		min-height: 8rem;
		background: var(--color-surface);
		border: 1.5px dashed var(--color-border-strong);
		border-radius: var(--radius-md);
		color: var(--color-muted);
		cursor: pointer;
		font-weight: 600;
		font-size: var(--font-size-md);
		transition:
			border-color 0.12s ease,
			color 0.12s ease,
			background 0.12s ease,
			box-shadow 0.12s ease,
			transform 0.05s ease;
	}

	.new-tile:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: var(--color-primary-soft);
		transform: translateY(-1px);
	}

	.new-tile:focus-visible {
		outline: none;
		border-color: var(--color-primary);
		color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	.new-tile :global(svg) {
		width: 2rem;
		height: 2rem;
	}

	.new-label {
		font-size: var(--font-size-sm);
	}

	.hint {
		margin: var(--space-6) 0 0;
		color: var(--color-muted);
		font-size: var(--font-size-sm);
		text-align: center;
	}
</style>
