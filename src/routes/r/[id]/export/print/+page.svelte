<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import Printer from '@lucide/svelte/icons/printer';
	import { ensureRoom, leaveRoom, type OpenRoom } from '$lib/room';
	import { buildSnapshot, type ExportSnapshot } from '$lib/exporters';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let room = $state<OpenRoom | null>(null);
	let snapshot = $state<ExportSnapshot | null>(null);
	let printed = false;

	const isEmpty = $derived(
		snapshot !== null && !snapshot.roomName && snapshot.columns.every((c) => c.cards.length === 0)
	);

	onMount(async () => {
		room = ensureRoom(data.id);
		// Wait for IndexedDB to hydrate the doc, then take the snapshot.
		await room.persistence.whenSynced;
		await tick();
		const snap = buildSnapshot(room.doc);
		snapshot = snap;
		// One more tick so the layout renders before the print dialog opens.
		await tick();
		const empty = !snap.roomName && snap.columns.every((c) => c.cards.length === 0);
		if (!printed && !empty) {
			printed = true;
			window.print();
		}
	});

	onDestroy(() => {
		// The print tab owns its own module-scoped `active` session — the
		// originating room tab has a separate one. Tear ours down so the
		// y-partykit websocket + IndexedDB persistence don't leak.
		leaveRoom();
	});

	function manualPrint() {
		window.print();
	}

	function fmtDate(ms: number): string {
		return new Date(ms).toLocaleString();
	}
</script>

<svelte:head>
	<title>{snapshot?.roomName ? `${snapshot.roomName} · Export` : 'Export'}</title>
</svelte:head>

<button type="button" class="print-btn" onclick={manualPrint} aria-label="Open print dialog">
	<Printer />
	<span>Print</span>
</button>

<main class="page">
	{#if !snapshot}
		<p class="loading">Loading retro…</p>
	{:else if isEmpty}
		<section class="empty-state">
			<h1>No local data for this room</h1>
			<p>
				This browser doesn't have a copy of this retro's data. Open the room first so it can sync
				from another participant, then try again.
			</p>
		</section>
	{:else}
		<header>
			<h1>{snapshot.roomName || 'Retro'}</h1>
			<dl class="meta">
				<div>
					<dt>Template</dt>
					<dd>{snapshot.templateLabel}</dd>
				</div>
				<div>
					<dt>Phase</dt>
					<dd>{snapshot.phase}</dd>
				</div>
				<div>
					<dt>Exported</dt>
					<dd>{fmtDate(snapshot.exportedAt)}</dd>
				</div>
			</dl>
		</header>

		{#each snapshot.columns as col (col.id)}
			<section class="column">
				<h2>{col.title}</h2>
				{#if col.cards.length === 0}
					<p class="empty">(no cards)</p>
				{:else}
					<ul>
						{#each col.cards as card (card.id)}
							<li>
								<div class="card-text">{card.text}</div>
								<div class="card-meta">
									<span class="author">{card.author}</span>
									{#if card.votes > 0}
										<span class="votes">· {card.votes} {card.votes === 1 ? 'vote' : 'votes'}</span>
									{/if}
									{#if card.discussed}
										<span class="discussed">· ✓ discussed</span>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/each}
	{/if}
</main>

<style>
	.page {
		max-width: 50rem;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		color: var(--color-text);
		background: var(--color-background);
	}

	.loading {
		color: var(--color-muted);
	}

	.empty-state {
		color: var(--color-muted);
		text-align: center;
		margin-top: 4rem;
	}

	.empty-state h1 {
		font-size: var(--font-size-xl);
		margin: 0 0 0.5rem;
		color: var(--color-text);
	}

	header {
		margin-bottom: 2rem;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 1rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-2xl);
	}

	.meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
		gap: 0.25rem 1rem;
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-muted);
	}

	.meta div {
		display: flex;
		gap: 0.4rem;
	}

	.meta dt {
		font-weight: 600;
	}

	.meta dt::after {
		content: ':';
	}

	.meta dd {
		margin: 0;
	}

	.column {
		page-break-inside: avoid;
		margin-bottom: 1.5rem;
	}

	.column h2 {
		font-size: var(--font-size-lg);
		margin: 0 0 0.5rem;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.25rem;
	}

	.empty {
		color: var(--color-muted);
		font-style: italic;
		margin: 0.25rem 0;
	}

	ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	li {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
		break-inside: avoid;
	}

	.card-text {
		font-size: var(--font-size-md);
		white-space: pre-wrap;
	}

	.card-meta {
		font-size: var(--font-size-sm);
		color: var(--color-muted);
		margin-top: 0.15rem;
	}

	.print-btn {
		position: fixed;
		top: 1rem;
		right: 1rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--font-size-sm);
		cursor: pointer;
		box-shadow: var(--shadow-card);
	}

	.print-btn:hover {
		background: var(--color-primary-hover);
	}

	@page {
		margin: 0.75in;
	}

	@media print {
		.print-btn {
			display: none;
		}
		.page {
			max-width: none;
			padding: 0;
		}
	}
</style>
