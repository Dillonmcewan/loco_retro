<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ensureRoom,
		leaveRoom,
		roomMetaStore,
		columnsStore,
		cardsStore,
		participantsStore,
		addCard,
		editCard,
		deleteCard,
		type Card,
		type CardsByColumn,
		type Participant,
		type OpenRoom,
		type RoomMetaSnapshot
	} from '$lib/room';
	import { getDisplayName, setDisplayName, getAuthorId } from '$lib/displayName';
	import CardView from '$lib/Card.svelte';
	import CardForm from '$lib/CardForm.svelte';
	import type { Column } from '$lib/templates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let displayName = $state<string | null>(null);
	let nameInput = $state('');
	let copied = $state(false);

	let meta = $state<RoomMetaSnapshot | null>(null);
	let cols = $state<Column[]>([]);
	let cards = $state<CardsByColumn>({});
	let people = $state<Participant[]>([]);
	let authorId = $state('');

	let room: OpenRoom | null = null;

	onMount(() => {
		const opened = ensureRoom(data.id);
		room = opened;

		const m = roomMetaStore(opened.doc);
		const c = columnsStore(opened.doc);
		const cs = cardsStore(opened.doc);
		const p = participantsStore(opened.awareness);

		authorId = getAuthorId();

		const unsubs: Array<() => void> = [
			m.subscribe((v) => {
				meta = v;
			}),
			c.subscribe((v) => {
				cols = v;
			}),
			cs.subscribe((v) => {
				cards = v;
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

	function handleAddCard(columnId: string, text: string) {
		if (!room || !displayName) return;
		addCard(room.doc, { columnId, text, author: displayName, authorId });
	}

	function handleEditCard(columnId: string, cardId: string, text: string) {
		if (!room) return;
		editCard(room.doc, columnId, cardId, text);
	}

	function handleDeleteCard(columnId: string, cardId: string) {
		if (!room) return;
		deleteCard(room.doc, columnId, cardId);
	}

	function cardsFor(columnId: string): Card[] {
		return cards[columnId] ?? [];
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
					<ul class="card-list">
						{#each cardsFor(column.id) as card (card.id)}
							<li>
								<CardView
									{card}
									currentAuthorId={authorId}
									onEdit={(text) => handleEditCard(column.id, card.id, text)}
									onDelete={() => handleDeleteCard(column.id, card.id)}
								/>
							</li>
						{/each}
					</ul>
					{#if cardsFor(column.id).length === 0}
						<p class="empty">No cards yet.</p>
					{/if}
					<CardForm onSubmit={(text) => handleAddCard(column.id, text)} />
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
		background: var(--color-surface);
		padding: 2.25rem 2.5rem 2.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
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
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font-weight: 500;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	header button:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.participants {
		margin-bottom: 2rem;
	}

	.participants h2 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.625rem;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
		padding: 0.25rem 0.75rem;
		background: var(--color-surface-soft);
		color: var(--color-text);
		border-radius: 1rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: 1rem;
	}

	.column {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1.125rem;
		min-height: 18rem;
		box-shadow: var(--shadow-card-sm);
	}

	.column h3 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}

	.empty {
		color: var(--color-muted);
		font-size: 0.875rem;
		margin: 0;
	}

	.card-list {
		list-style: none;
		padding: 0;
		margin: 0 0 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.gate h1 {
		margin: 0 0 0.5rem;
		font-size: 1.5rem;
	}

	.gate p {
		margin: 0 0 1.25rem;
		color: var(--color-muted);
	}

	.gate form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.gate label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.gate input {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.gate input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	.gate button {
		align-self: stretch;
		padding: 0.75rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		box-shadow: var(--shadow-button);
		transition:
			background 0.15s ease,
			transform 0.05s ease;
	}

	.gate button:hover {
		background: var(--color-primary-hover);
	}

	.gate button:active {
		transform: translateY(1px);
	}
</style>
