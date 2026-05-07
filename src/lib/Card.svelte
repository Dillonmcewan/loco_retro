<script lang="ts">
	import type { Card } from './room';

	type Props = {
		card: Card;
		currentAuthorId: string;
		onEdit: (text: string) => void;
		onDelete: () => void;
	};

	let { card, currentAuthorId, onEdit, onDelete }: Props = $props();

	let editing = $state(false);
	let draft = $state('');

	const isOwner = $derived(card.authorId === currentAuthorId);

	function startEdit() {
		draft = card.text;
		editing = true;
	}

	function cancelEdit() {
		editing = false;
		draft = '';
	}

	function saveEdit() {
		const trimmed = draft.trim();
		if (!trimmed) return;
		onEdit(trimmed);
		editing = false;
		draft = '';
	}

	function onTextareaKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	}
</script>

<article class="card">
	{#if editing}
		<textarea bind:value={draft} onkeydown={onTextareaKeydown} aria-label="Edit card" rows="3"
		></textarea>
		<div class="actions">
			<button type="button" onclick={saveEdit}>Save</button>
			<button type="button" class="secondary" onclick={cancelEdit}>Cancel</button>
		</div>
	{:else}
		<p class="text">{card.text}</p>
		<footer>
			<span class="author">{card.author}</span>
			{#if isOwner}
				<div class="owner-actions">
					<button type="button" onclick={startEdit} aria-label="Edit card">Edit</button>
					<button type="button" class="secondary" onclick={onDelete} aria-label="Delete card">
						Delete
					</button>
				</div>
			{/if}
		</footer>
	{/if}
</article>

<style>
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: 0.75rem 0.875rem;
		box-shadow: var(--shadow-card-sm);
	}

	.text {
		margin: 0 0 0.5rem;
		white-space: pre-wrap;
		word-break: break-word;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.75rem;
	}

	.author {
		color: var(--color-muted);
		font-weight: 500;
	}

	.owner-actions {
		display: flex;
		gap: 0.25rem;
	}

	button {
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	button:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	button.secondary {
		color: var(--color-muted);
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		min-height: 4rem;
		padding: 0.5rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font: inherit;
		resize: vertical;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}
</style>
