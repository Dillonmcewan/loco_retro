<script lang="ts">
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
		{placeholder}
		aria-label="New card text"
		rows="2"
	></textarea>
	<button type="submit" disabled={text.trim() === ''}>Add</button>
</form>

<style>
	.card-form {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-top: 0.5rem;
	}

	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 0.5rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font: inherit;
		resize: vertical;
		min-height: 2.5rem;
	}

	textarea:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	button {
		align-self: flex-end;
		padding: 0.375rem 0.875rem;
		font-size: 0.8125rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-sm);
		font-weight: 600;
		cursor: pointer;
	}

	button:disabled {
		background: var(--color-border-strong);
		cursor: not-allowed;
	}

	button:not(:disabled):hover {
		background: var(--color-primary-hover);
	}
</style>
