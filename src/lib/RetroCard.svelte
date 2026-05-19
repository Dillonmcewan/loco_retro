<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Circle from '@lucide/svelte/icons/circle';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import type { Snippet } from 'svelte';
	import type { Card as CardType, Phase } from './room';
	import { autosize } from './autosize';
	import { tooltip } from './tooltip';

	type Props = {
		card: CardType;
		currentAuthorId: string;
		phase: Phase;
		onEdit: (text: string) => void;
		onDelete: () => void;
		voteTotal?: number;
		votingSlot?: Snippet;
		discussed?: boolean;
		onToggleDiscussed?: () => void;
	};

	let {
		card,
		currentAuthorId,
		phase,
		onEdit,
		onDelete,
		voteTotal = 0,
		votingSlot,
		discussed = false,
		onToggleDiscussed
	}: Props = $props();

	// Animation fires only on the false → true transition. `prevDiscussed`
	// starts undefined so the first observation on mount is a no-op — without
	// this guard, mounting an already-discussed card (e.g. joining a room
	// late) would replay the burst. Un-discussing is also a no-op.
	let prevDiscussed: boolean | undefined;
	let animating = $state(false);

	$effect.pre(() => {
		const current = discussed;
		if (prevDiscussed === false && current === true) {
			animating = true;
			const t = setTimeout(() => (animating = false), 700);
			prevDiscussed = current;
			return () => clearTimeout(t);
		}
		prevDiscussed = current;
	});

	// 14 confetti dots fanned around the card center with varied distances so
	// the burst reads as scattered rather than geometric.
	const CONFETTI_DOTS = [
		{ angle: 0, distance: 110, color: 'var(--color-primary)' },
		{ angle: 26, distance: 80, color: 'var(--color-secondary)' },
		{ angle: 52, distance: 130, color: 'var(--color-tertiary)' },
		{ angle: 78, distance: 70, color: 'var(--color-phase-closed)' },
		{ angle: 104, distance: 120, color: 'var(--color-success)' },
		{ angle: 130, distance: 90, color: 'var(--color-primary)' },
		{ angle: 156, distance: 115, color: 'var(--color-secondary)' },
		{ angle: 182, distance: 75, color: 'var(--color-tertiary)' },
		{ angle: 208, distance: 125, color: 'var(--color-phase-closed)' },
		{ angle: 234, distance: 95, color: 'var(--color-success)' },
		{ angle: 260, distance: 110, color: 'var(--color-primary)' },
		{ angle: 286, distance: 85, color: 'var(--color-secondary)' },
		{ angle: 312, distance: 125, color: 'var(--color-tertiary)' },
		{ angle: 338, distance: 90, color: 'var(--color-phase-closed)' }
	] as const;

	const showDiscussedToggle = $derived(phase === 'discuss');
	const showDiscussedIndicator = $derived(phase === 'closed' && discussed);

	// Aggregate totals are hidden during Vote to keep running tallies from
	// biasing voters; they only appear from Discuss onward.
	const showAggregate = $derived(voteTotal > 0 && (phase === 'discuss' || phase === 'closed'));

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
			editing = false;
			draft = '';
		} else {
			saveEdit();
		}
	}

	// Save / Cancel mousedown calls this so the textarea doesn't lose focus
	// before the click fires.
	function keepFocus(event: MouseEvent) {
		event.preventDefault();
	}
</script>

<article class="retro-card" class:discussed class:animating>
	{#if animating}
		<span class="confetti" aria-hidden="true">
			{#each CONFETTI_DOTS as dot, i (i)}
				<span
					class="confetti-dot"
					style:--angle="{dot.angle}deg"
					style:--distance="{dot.distance}px"
					style:background={dot.color}
				></span>
			{/each}
		</span>
	{/if}
	<div class="text-slot">
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
		{:else}
			<p class="text" class:editable={canMutate} ondblclick={canMutate ? startEdit : undefined}>
				{card.text}
			</p>
		{/if}
	</div>
	<footer>
		<span class="author">{card.author}</span>
		<div class="footer-right">
			{#if showAggregate}
				<span class="vote-total" aria-label="Total votes on this card">
					Votes: {voteTotal}
				</span>
			{/if}
			{#if votingSlot && phase === 'vote'}
				{@render votingSlot()}
			{/if}
			{#if showDiscussedToggle}
				<button
					type="button"
					class="icon discussed-toggle"
					class:on={discussed}
					aria-pressed={discussed}
					aria-label={discussed ? 'Mark as not discussed' : 'Mark as discussed'}
					onclick={onToggleDiscussed}
					use:tooltip={discussed ? 'Mark as not discussed' : 'Mark as discussed'}
				>
					{#if discussed}
						<CheckCircle2 />
					{:else}
						<Circle />
					{/if}
				</button>
			{:else if showDiscussedIndicator}
				<span class="discussed-indicator" aria-label="Discussed">
					<Check />
				</span>
			{/if}
			<div class="owner-actions" class:editing>
				{#if editing}
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
				{:else if canMutate}
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
				{/if}
			</div>
		</div>
	</footer>
</article>

<style>
	.retro-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3) var(--space-4);
		box-shadow: var(--shadow-card-sm);
	}

	.text-slot {
		min-height: 1.5rem;
		margin: 0 0 var(--space-2);
	}

	.text {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		line-height: 1.5;
	}

	.text.editable {
		cursor: text;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		font-size: var(--font-size-xs);
		min-height: 1.75rem;
	}

	.author {
		color: var(--color-muted);
		font-weight: 500;
	}

	.footer-right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-left: auto;
	}

	:global(.retro-card.discussed) {
		background: var(--color-success-soft);
		border-color: var(--color-success);
	}

	:global(.retro-card.discussed) .text,
	:global(.retro-card.discussed) .author {
		color: var(--color-muted);
		text-decoration: line-through;
	}

	button.icon.discussed-toggle.on {
		color: var(--color-success);
		opacity: 1;
	}

	.discussed-indicator {
		display: inline-flex;
		align-items: center;
		color: var(--color-success);
	}

	.discussed-indicator :global(svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}

	.vote-total {
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-soft);
		color: var(--color-text);
		border-radius: var(--radius-sm);
		font-weight: 600;
		font-size: var(--font-size-xs);
	}

	.owner-actions {
		display: flex;
		gap: var(--space-2);
		justify-content: flex-end;
		opacity: 0;
		transition: opacity 0.1s ease;
	}

	.owner-actions:empty {
		display: none;
	}

	.owner-actions.editing {
		opacity: 1;
	}

	.retro-card:hover .owner-actions,
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

	button.icon:hover:not(:disabled) {
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
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: var(--space-2);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font: inherit;
		line-height: 1.5;
		resize: none;
		overflow: hidden;
	}

	/* ─── Discussed-toggle animations ──────────────────────────────────── */

	/* stamp: card nudges 1 → 1.02 → 1, icon punches in with rotation kick. */
	:global(.retro-card.animating) {
		animation: stamp-card 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
		transform-origin: center;
	}

	:global(.retro-card.animating .discussed-toggle svg) {
		animation: stamp-icon 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
		transform-origin: center;
	}

	@keyframes stamp-card {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.01);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes stamp-icon {
		0% {
			transform: scale(0.85) rotate(-3deg);
		}
		60% {
			transform: scale(1.1) rotate(2deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
	}

	/* confetti: dots fan outward from the card center, spread across the whole card. */
	:global(.retro-card) {
		position: relative;
	}

	.confetti {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: visible;
		display: block;
		z-index: 1;
	}

	.confetti-dot {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		animation: confetti-burst 650ms ease-out forwards;
	}

	@keyframes confetti-burst {
		0% {
			transform: translate(-50%, -50%) scale(0.3);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		100% {
			transform: translate(-50%, -50%)
				translate(
					calc(cos(var(--angle)) * var(--distance)),
					calc(sin(var(--angle)) * var(--distance))
				)
				scale(1);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(.retro-card.animating),
		:global(.retro-card.animating .discussed-toggle svg) {
			animation: none;
		}

		.confetti-dot {
			animation: none;
			opacity: 0;
		}
	}
</style>
