<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		ensureRoom,
		leaveRoom,
		roomMetaStore,
		columnsStore,
		cardsStore,
		participantsStore,
		myBallotStore,
		voteTotalsStore,
		votesSpentByAuthorStore,
		addCard,
		editCard,
		deleteCard,
		advancePhase,
		stepBackPhase,
		castVote,
		retractVote,
		toggleDiscussed,
		type Ballot,
		type Card,
		type CardsByColumn,
		type Participant,
		type OpenRoom,
		type Phase,
		type RoomMetaSnapshot,
		type VoteTotals,
		type VotesSpentByAuthor
	} from '$lib/room';
	import { getDisplayName, setDisplayName, getAuthorId } from '$lib/displayName';
	import { upsertRoom } from '$lib/rooms';
	import Share2 from 'lucide-svelte/icons/share-2';
	import ArrowLeft from 'lucide-svelte/icons/arrow-left';
	import Check from 'lucide-svelte/icons/check';
	import { tooltip } from '$lib/tooltip';
	import { placeholderFor } from '$lib/emptyPlaceholders';
	import { colorsByParticipant } from '$lib/participantColor';
	import RetroCard from '$lib/RetroCard.svelte';
	import CardForm from '$lib/CardForm.svelte';
	import PhaseControls from '$lib/PhaseControls.svelte';
	import VoteControls from '$lib/VoteControls.svelte';
	import VoteBudget from '$lib/VoteBudget.svelte';
	import CollectStatus from '$lib/CollectStatus.svelte';
	import Toast from '$lib/Toast.svelte';
	import ClosedCelebration from '$lib/ClosedCelebration.svelte';
	import type { Column } from '$lib/templates';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let displayName = $state<string | null>(null);
	let nameInput = $state('');
	let toast = $state<{ kind: 'success' | 'error'; message: string } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function showToast(kind: 'success' | 'error', message: string) {
		if (toastTimer) clearTimeout(toastTimer);
		toast = { kind, message };
		toastTimer = setTimeout(() => {
			toast = null;
			toastTimer = null;
		}, 2500);
	}

	let meta = $state<RoomMetaSnapshot | null>(null);
	let cols = $state<Column[]>([]);
	let cards = $state<CardsByColumn>({});
	let people = $state<Participant[]>([]);
	let authorId = $state('');
	let myBallot = $state<Ballot>({});
	let voteTotals = $state<VoteTotals>({});
	let votesSpentByAuthor = $state<VotesSpentByAuthor>({});
	let localReady = $state(false);

	const participantColors = $derived(colorsByParticipant(people));
	const phase = $derived<Phase>(meta?.phase ?? 'collect');
	const votesTotal = $derived(meta?.votesPerParticipant ?? 5);
	const votesSpent = $derived(Object.values(myBallot).reduce((acc, n) => acc + n, 0));
	const votesRemaining = $derived(Math.max(votesTotal - votesSpent, 0));
	const canCastVote = $derived(phase === 'vote' && votesRemaining > 0);
	const showProgress = $derived(phase === 'collect' || phase === 'vote');
	const doneByClientId = $derived.by(() => {
		const out = new Map<number, boolean>();
		for (const p of people) {
			if (phase === 'collect') {
				out.set(p.clientId, p.ready);
			} else if (phase === 'vote') {
				const spent = p.authorId ? (votesSpentByAuthor[p.authorId] ?? 0) : 0;
				out.set(p.clientId, p.authorId !== '' && spent >= votesTotal);
			} else {
				out.set(p.clientId, false);
			}
		}
		return out;
	});
	const everyoneDone = $derived(
		showProgress && people.length > 0 && people.every((p) => doneByClientId.get(p.clientId))
	);

	// During Discuss/Closed, sort each column's cards by vote total descending,
	// tie-broken by createdAt ascending. Other phases keep insertion order.
	const displayedCards = $derived.by(() => {
		if (phase !== 'discuss' && phase !== 'closed') return cards;
		const out: CardsByColumn = {};
		for (const [colId, list] of Object.entries(cards)) {
			out[colId] = [...list].sort((a, b) => {
				const va = voteTotals[a.id] ?? 0;
				const vb = voteTotals[b.id] ?? 0;
				if (vb !== va) return vb - va;
				return a.createdAt - b.createdAt;
			});
		}
		return out;
	});

	let room: OpenRoom | null = null;

	onMount(() => {
		const opened = ensureRoom(data.id);
		room = opened;

		const m = roomMetaStore(opened.doc);
		const c = columnsStore(opened.doc);
		const cs = cardsStore(opened.doc);
		const p = participantsStore(opened.awareness);

		authorId = getAuthorId();

		const mb = myBallotStore(opened.doc, authorId);
		const vt = voteTotalsStore(opened.doc);
		const vsa = votesSpentByAuthorStore(opened.doc);

		let indexedPhase: string | null = null;
		const unsubs: Array<() => void> = [
			m.subscribe((v) => {
				meta = v;
				if (v && v.name && v.phase !== indexedPhase) {
					indexedPhase = v.phase;
					upsertRoom({
						id: data.id,
						name: v.name,
						templateId: v.templateId,
						lastOpenedAt: Date.now(),
						phase: v.phase
					});
				}
			}),
			c.subscribe((v) => {
				cols = v;
			}),
			cs.subscribe((v) => {
				cards = v;
			}),
			p.subscribe((v) => {
				people = v;
			}),
			mb.subscribe((v) => {
				myBallot = v;
			}),
			vt.subscribe((v) => {
				voteTotals = v;
			}),
			vsa.subscribe((v) => {
				votesSpentByAuthor = v;
			})
		];

		const saved = getDisplayName();
		if (saved) {
			displayName = saved;
			opened.awareness.setLocalStateField('user', { name: saved, authorId, ready: false });
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
		room.awareness.setLocalStateField('user', { name: trimmed, authorId, ready: false });
	}

	function setReady(value: boolean) {
		if (!room || !displayName) return;
		localReady = value;
		room.awareness.setLocalStateField('user', { name: displayName, authorId, ready: value });
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

	function handleAdvancePhase() {
		if (!room) return;
		advancePhase(room.doc);
	}

	function handleBackPhase() {
		if (!room) return;
		stepBackPhase(room.doc);
	}

	function handleCastVote(cardId: string) {
		if (!room) return;
		castVote(room.doc, authorId, cardId);
	}

	function handleRetractVote(cardId: string) {
		if (!room) return;
		retractVote(room.doc, authorId, cardId);
	}

	function handleToggleDiscussed(columnId: string, cardId: string) {
		if (!room) return;
		toggleDiscussed(room.doc, columnId, cardId);
	}

	function cardsFor(columnId: string): Card[] {
		return displayedCards[columnId] ?? [];
	}

	async function copyUrl() {
		if (typeof navigator === 'undefined' || !navigator.clipboard) {
			showToast('error', "Couldn't copy link — clipboard unavailable");
			return;
		}
		try {
			await navigator.clipboard.writeText(window.location.href);
			showToast('success', 'Link copied to clipboard');
		} catch {
			showToast('error', "Couldn't copy link to clipboard");
		}
	}
</script>

<svelte:head>
	<title>{meta?.name ? `${meta.name} · LocoRetro` : 'LocoRetro'}</title>
</svelte:head>

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
			<div class="title">
				<a
					class="link back"
					href="/"
					aria-label="Back to dashboard"
					use:tooltip={'Back to dashboard'}
				>
					<ArrowLeft />
				</a>
				<h1>{meta?.name ?? 'Untitled retro'}</h1>
				<button
					type="button"
					class="link"
					onclick={copyUrl}
					aria-label="Copy invite link"
					use:tooltip={'Copy invite link'}
				>
					<Share2 />
				</button>
			</div>
			<div class="phase-stack">
				<PhaseControls
					{phase}
					onAdvance={handleAdvancePhase}
					onBack={handleBackPhase}
					advanceReady={everyoneDone}
				/>
				<div class="vote-budget-slot">
					{#if phase === 'vote'}
						<VoteBudget remaining={votesRemaining} total={votesTotal} />
					{:else if phase === 'collect'}
						<CollectStatus ready={localReady} onToggle={() => setReady(!localReady)} />
					{/if}
				</div>
			</div>
			<ul class="participants" aria-label="Participants">
				{#each people as p, i (p.clientId)}
					{@const color = participantColors.get(p.clientId)}
					{@const done = doneByClientId.get(p.clientId) ?? false}
					{@const pending = showProgress && !done}
					{@const doneLabel = phase === 'collect' ? 'Done adding cards' : 'Done voting'}
					<li
						class:pending
						class:done={showProgress && done}
						style:background-color={color?.bg}
						style:color={color?.fg}
						style:--wave-index={i}
					>
						<span class="pname">{p.name}</span>
						{#if showProgress && done}
							<Check class="done-check" aria-label={doneLabel} />
						{/if}
					</li>
				{/each}
			</ul>
		</header>

		{#if toast}
			<Toast kind={toast.kind} message={toast.message} />
		{/if}

		<section aria-label="Columns" class="columns">
			{#each cols as column, columnIndex (column.id)}
				<article class="column">
					<h3>{column.title}</h3>
					<div class="column-scroll">
						<ul class="card-list">
							{#each cardsFor(column.id) as card (card.id)}
								<li>
									<RetroCard
										{card}
										currentAuthorId={authorId}
										{phase}
										voteTotal={voteTotals[card.id] ?? 0}
										discussed={card.discussed ?? false}
										onEdit={(text) => handleEditCard(column.id, card.id, text)}
										onDelete={() => handleDeleteCard(column.id, card.id)}
										onToggleDiscussed={() => handleToggleDiscussed(column.id, card.id)}
									>
										{#snippet votingSlot()}
											{#if phase === 'vote'}
												<VoteControls
													myCount={myBallot[card.id] ?? 0}
													canIncrement={canCastVote}
													onIncrement={() => handleCastVote(card.id)}
													onDecrement={() => handleRetractVote(card.id)}
												/>
											{/if}
										{/snippet}
									</RetroCard>
								</li>
							{/each}
						</ul>
						{#if cardsFor(column.id).length === 0}
							{@const placeholder = placeholderFor(data.id, columnIndex)}
							<div
								class="empty"
								aria-label="No cards yet"
								style:--empty-icon-color={placeholder.color}
							>
								<placeholder.Icon />
								<span>{placeholder.text}</span>
							</div>
						{/if}
					</div>
					{#if phase === 'collect'}
						<CardForm onSubmit={(text) => handleAddCard(column.id, text)} />
					{/if}
				</article>
			{/each}
		</section>

		<ClosedCelebration {phase} roomId={data.id} />
	</main>
{/if}

<style>
	main {
		max-width: 80rem;
		margin: var(--space-8) auto;
		padding: 0 var(--space-6);
	}

	main.room {
		max-width: none;
		height: 100vh;
		margin: 0;
		padding: var(--space-4) var(--space-12);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		min-height: 0;
	}

	main.gate {
		max-width: 24rem;
		margin: var(--space-24) auto;
		background: var(--color-surface);
		padding: var(--space-8) var(--space-10) var(--space-10);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
	}

	header {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-8);
		flex: none;
	}

	header :global(.phase-controls) {
		padding: var(--space-2) var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-card, 0 1px 2px rgba(0, 0, 0, 0.04));
	}

	.phase-stack {
		justify-self: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
	}

	main.room header {
		margin-bottom: 0;
	}

	h1 {
		margin: 0;
	}

	.title {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex: none;
	}

	.link {
		display: inline-flex;
		align-items: center;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		line-height: 0;
	}

	.link:hover {
		color: var(--color-primary);
	}

	.link:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: 2px;
	}

	.link :global(svg) {
		width: 1.375rem;
		height: 1.375rem;
	}

	.participants {
		min-width: 0;
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.participants li {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-3);
		border-radius: 1rem;
		font-size: var(--font-size-sm);
		font-weight: 500;
		transform-origin: center;
	}

	.participants li.pending {
		animation: pulse-wave 1.4s ease-in-out infinite;
		animation-delay: calc(var(--wave-index, 0) * 0.18s);
	}

	.participants li :global(.done-check) {
		width: 0.9rem;
		height: 0.9rem;
	}

	@keyframes pulse-wave {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.participants li.pending {
			animation: none;
		}
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-4);
		flex: 1 1 auto;
		min-height: 0;
	}

	.column {
		background: var(--color-surface-soft);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-5) var(--space-3);
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}

	.column-scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		margin: 0 calc(-1 * var(--space-2));
		padding: 0 var(--space-2);
	}

	.column h3 {
		margin: 0 0 var(--space-3);
		font-size: var(--font-size-md);
		flex: none;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-height: 5rem;
		padding: var(--space-4) var(--space-2);
		color: var(--color-muted);
		font-size: var(--font-size-sm);
		opacity: 0.7;
	}

	.empty :global(svg) {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--empty-icon-color, var(--color-tertiary));
	}

	.vote-budget-slot {
		min-height: 1.875rem;
		display: flex;
		align-items: center;
	}

	.card-list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.gate h1 {
		margin: 0 0 var(--space-2);
		font-size: var(--font-size-xl);
	}

	.gate p {
		margin: 0 0 var(--space-5);
		color: var(--color-muted);
	}

	.gate form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.gate label {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.gate input {
		padding: var(--space-3) var(--space-3);
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
		padding: var(--space-3) var(--space-5);
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
