<script lang="ts">
	import { autosize } from './autosize';
	import { tooltip } from './tooltip';

	type Props = {
		onSubmit: (text: string) => void;
		placeholder?: string;
	};

	let { onSubmit, placeholder = 'Add a card…' }: Props = $props();

	let text = $state('');

	function submit() {
		const trimmed = text.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		text = '';
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			submit();
		}
	}

	function onFormSubmit(event: SubmitEvent) {
		event.preventDefault();
		submit();
	}
</script>

<form class="card-form" onsubmit={onFormSubmit}>
	<textarea
		bind:value={text}
		onkeydown={onKeydown}
		use:autosize={text}
		{placeholder}
		aria-label="New card text"
		rows="1"
	></textarea>
	<button
		type="submit"
		aria-label="Add card"
		use:tooltip={'Add card'}
		disabled={text.trim() === ''}
	>
		<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
			<path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
		</svg>
	</button>
</form>

<style>
	.card-form {
		display: flex;
		flex-direction: row;
		align-items: flex-end;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}

	textarea {
		flex: 1 1 auto;
		min-width: 0;
		box-sizing: border-box;
		padding: 0.5rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font: inherit;
		resize: none;
		overflow: hidden;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	button {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	button svg {
		width: 1rem;
		height: 1rem;
	}

	button:disabled {
		background: var(--color-border-strong);
		cursor: not-allowed;
	}

	button:not(:disabled):hover {
		background: var(--color-primary-hover);
	}
</style>
