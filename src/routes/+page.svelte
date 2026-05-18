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
	<a
		class="github-link"
		href="https://github.com/Dillonmcewan/loco_retro"
		target="_blank"
		rel="noopener noreferrer"
		aria-label="View source on GitHub"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54 0-.27-.01-1.16-.02-2.1-3.13.68-3.79-1.34-3.79-1.34-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.39-1.22.71-1.5-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15.9-.25 1.86-.37 2.82-.38.96.01 1.92.13 2.82.38 2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.34.76 1.02.76 2.05 0 1.48-.01 2.67-.01 3.03 0 .3.2.65.78.54 4.46-1.49 7.68-5.7 7.68-10.67C23.25 5.48 18.27.5 12 .5z"
			/>
		</svg>
	</a>
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
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
	}

	.github-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-muted);
		border-radius: var(--radius-sm);
		padding: var(--space-1);
		transition: color 0.15s ease;
	}

	.github-link:hover {
		color: var(--color-text);
	}

	.github-link :global(svg) {
		width: 1.25rem;
		height: 1.25rem;
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
