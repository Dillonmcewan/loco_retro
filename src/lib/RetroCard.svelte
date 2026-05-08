<script lang="ts">
	import Check from 'lucide-svelte/icons/check';
	import Pencil from 'lucide-svelte/icons/pencil';
	import Trash2 from 'lucide-svelte/icons/trash-2';
	import X from 'lucide-svelte/icons/x';
	import type { Card as CardType, Phase } from './room';
	import Card from './Card.svelte';
	import { autosize } from './autosize';
	import { tooltip } from './tooltip';

	type Props = {
		card: CardType;
		currentAuthorId: string;
		phase: Phase;
		onEdit: (text: string) => void;
		onDelete: () => void;
	};

	let { card, currentAuthorId, phase, onEdit, onDelete }: Props = $props();

	let editing = $state(false);
	let draft = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const canMutate = $derived(card.authorId === currentAuthorId && phase === 'collect');

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
		const trimmed = draft.trim();
		if (trimmed === '') {
			cancelEdit();
		} else if (trimmed === card.text) {
			// Unchanged — exit edit mode without calling onEdit. (editCard
			// already short-circuits on identical text, but skipping the call
			// avoids a render churn cycle.)
			editing = false;
			draft = '';
		} else {
			saveEdit();
		}
	}

	// Save / Cancel mousedown calls this so the textarea doesn't lose focus
	// before the click fires. Without it, blurring the textarea would trigger
	// onTextareaBlur (which auto-saves), beating the explicit Cancel click.
	function keepFocus(event: MouseEvent) {
		event.preventDefault();
	}
</script>

<Card class="retro-card">
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
				<Check />
			</button>
			<button
				type="button"
				class="icon danger"
				onmousedown={keepFocus}
				onclick={cancelEdit}
				aria-label="Cancel edit"
				use:tooltip={'Cancel edit'}
			>
				<X />
			</button>
		</div>
	{:else}
		<p class="text" class:editable={canMutate} ondblclick={canMutate ? startEdit : undefined}>
			{card.text}
		</p>
		<footer>
			<span class="author">{card.author}</span>
			{#if canMutate}
				<div class="owner-actions">
					<button
						type="button"
						class="icon"
						onclick={startEdit}
						aria-label="Edit card"
						use:tooltip={'Edit card'}
					>
						<Pencil />
					</button>
					<button
						type="button"
						class="icon danger"
						onclick={onDelete}
						aria-label="Delete card"
						use:tooltip={'Delete card'}
					>
						<Trash2 />
					</button>
				</div>
			{/if}
		</footer>
	{/if}
</Card>

<style>
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

	/* `.retro-card` is on Card.svelte's <article>, outside this scope; the
	   inner `.owner-actions` is scoped here. The combinator works at runtime. */
	:global(.retro-card:hover) .owner-actions,
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

	button.icon :global(svg) {
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
