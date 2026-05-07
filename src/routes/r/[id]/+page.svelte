<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ensureRoom,
		leaveRoom,
		roomMetaStore,
		columnsStore,
		participantsStore,
		type Participant,
		type OpenRoom,
		type RoomMetaSnapshot
	} from '$lib/room';
	import { getDisplayName, setDisplayName } from '$lib/displayName';
	import type { Column } from '$lib/templates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let displayName = $state<string | null>(null);
	let nameInput = $state('');
	let copied = $state(false);

	let meta = $state<RoomMetaSnapshot | null>(null);
	let cols = $state<Column[]>([]);
	let people = $state<Participant[]>([]);

	let room: OpenRoom | null = null;

	onMount(() => {
		const opened = ensureRoom(data.id);
		room = opened;

		const m = roomMetaStore(opened.doc);
		const c = columnsStore(opened.doc);
		const p = participantsStore(opened.awareness);

		const unsubs: Array<() => void> = [
			m.subscribe((v) => {
				meta = v;
			}),
			c.subscribe((v) => {
				cols = v;
			}),
			p.subscribe((v) => {
				people = v;
			})
		];

		const saved = getDisplayName();
		if (saved) {
			displayName = saved;
			opened.awareness.setLocalStateField('user', { name: saved });
		}

		return () => unsubs.forEach((fn) => fn());
	});

	onDestroy(() => {
		leaveRoom();
		room = null;
	});

	function submitName(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = nameInput.trim();
		if (!trimmed || !room) return;
		setDisplayName(trimmed);
		displayName = trimmed;
		room.awareness.setLocalStateField('user', { name: trimmed });
	}

	async function copyUrl() {
		if (typeof navigator === 'undefined' || !navigator.clipboard) return;
		try {
			await navigator.clipboard.writeText(window.location.href);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard write can fail in restricted contexts; ignore for now.
		}
	}
</script>

{#if !displayName}
	<main class="gate">
		<h1>Join the retro</h1>
		<p>Enter a display name to join.</p>
		<form onsubmit={submitName}>
			<label>
				<span>Display name</span>
				<input bind:value={nameInput} type="text" autocomplete="name" required />
			</label>
			<button type="submit">Join</button>
		</form>
	</main>
{:else}
	<main class="room">
		<header>
			<h1>{meta?.name ?? 'Untitled retro'}</h1>
			<button type="button" onclick={copyUrl}>
				{copied ? 'Copied!' : 'Copy invite URL'}
			</button>
		</header>

		<section aria-label="Participants" class="participants">
			<h2>Participants ({people.length})</h2>
			<ul>
				{#each people as p (p.clientId)}
					<li>{p.name}</li>
				{/each}
			</ul>
		</section>

		<section aria-label="Columns" class="columns">
			{#each cols as column (column.id)}
				<article class="column">
					<h3>{column.title}</h3>
					<p class="empty">No cards yet.</p>
				</article>
			{/each}
		</section>
	</main>
{/if}

<style>
	main {
		max-width: 80rem;
		margin: 2rem auto;
		padding: 0 1.5rem;
	}

	main.gate {
		max-width: 24rem;
		margin: 6rem auto;
	}

	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	h1 {
		margin: 0;
	}

	header button {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
	}

	.participants {
		margin-bottom: 2rem;
	}

	.participants h2 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
		color: #555;
	}

	.participants ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.participants li {
		padding: 0.25rem 0.625rem;
		background: #eee;
		border-radius: 1rem;
		font-size: 0.875rem;
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.column {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 0.5rem;
		padding: 1rem;
		min-height: 18rem;
	}

	.column h3 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}

	.empty {
		color: #888;
		font-size: 0.875rem;
		margin: 0;
	}

	.gate form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.gate label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 500;
	}

	.gate input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
	}

	.gate button {
		align-self: flex-start;
		padding: 0.5rem 1.25rem;
		background: #1a1a1a;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
	}
</style>
