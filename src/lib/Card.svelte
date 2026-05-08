<script lang="ts">
	import type { Card } from './room';
	import { autosize } from './autosize';
	import { tooltip } from './tooltip';

	type Props = {
		card: Card;
		currentAuthorId: string;
		onEdit: (text: string) => void;
		onDelete: () => void;
	};

	let { card, currentAuthorId, onEdit, onDelete }: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const isOwner = $derived(card.authorId === currentAuthorId);

	$effect(() => {
		if (editing && textareaEl) {
			textareaEl.focus();
			const len = textareaEl.value.length;
			textareaEl.setSelectionRange(len, len);
		}
	});

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

	function onTextareaBlur() {
		if (!editing) return;
		if (draft.trim() === '') {
			cancelEdit();
		} else {
			saveEdit();
		}
	}

	function keepFocus(event: MouseEvent) {
		event.preventDefault();
	}
</script>

<article class="card">
	{#if editing}
		<textarea
			bind:this={textareaEl}
			bind:value={draft}
			onkeydown={onTextareaKeydown}
			onblur={onTextareaBlur}
			use:autosize={draft}
			aria-label="Edit card"
			rows="1"
		></textarea>
		<div class="actions">
			<button
				type="button"
				class="icon success"
				onmousedown={keepFocus}
				onclick={saveEdit}
				aria-label="Save changes"
				use:tooltip={'Save changes'}
			>
				<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
					<path
						d="M4 10.5l3.5 3.5L16 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<button
				type="button"
				class="icon danger"
				onmousedown={keepFocus}
				onclick={cancelEdit}
				aria-label="Cancel edit"
				use:tooltip={'Cancel edit'}
			>
				<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
					<path
						d="M5 5l10 10M15 5L5 15"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>
	{:else}
		<p class="text" class:editable={isOwner} ondblclick={isOwner ? startEdit : undefined}>
			{card.text}
		</p>
		<footer>
			<span class="author">{card.author}</span>
			{#if isOwner}
				<div class="owner-actions">
					<button
						type="button"
						class="icon"
						onclick={startEdit}
						aria-label="Edit card"
						use:tooltip={'Edit card'}
					>
						<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
							<path
								d="M3 17l4-1 9-9-3-3-9 9-1 4zM12 5l3 3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
					<button
						type="button"
						class="icon danger"
						onclick={onDelete}
						aria-label="Delete card"
						use:tooltip={'Delete card'}
					>
						<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
							<path
								d="M5 6h10M8 6V4h4v2M6 6l1 10h6l1-10M9 9v5M11 9v5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
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

	.text.editable {
		cursor: text;
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
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.1s ease;
	}

	.card:hover .owner-actions,
	.owner-actions:focus-within {
		opacity: 1;
	}

	button.icon {
		display: inline-flex;
		align-items: center;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		line-height: 0;
	}

	button.icon:hover {
		color: var(--color-primary);
	}

	button.icon.danger {
		color: var(--color-danger);
		opacity: 0.75;
	}

	button.icon.danger:hover {
		color: var(--color-danger);
		opacity: 1;
	}

	button.icon.success {
		color: var(--color-success);
		opacity: 0.85;
	}

	button.icon.success:hover {
		color: var(--color-success);
		opacity: 1;
	}

	button.icon:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
		border-radius: 2px;
	}

	button.icon svg {
		width: 1.375rem;
		height: 1.375rem;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font: inherit;
		resize: none;
		overflow: hidden;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}
</style>
