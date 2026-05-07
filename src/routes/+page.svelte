<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateRoomId, ensureRoom, seedRoom } from '$lib/room';
	import { PRESET_TEMPLATES, DEFAULT_TEMPLATE_ID } from '$lib/templates';

	let name = $state('');
	let templateId = $state<string>(DEFAULT_TEMPLATE_ID);
	let submitting = $state(false);
	let errorMsg = $state<string | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) {
			errorMsg = 'Room name is required.';
			return;
		}
		if (submitting) return;
		submitting = true;
		errorMsg = null;
		try {
			const id = generateRoomId();
			const room = ensureRoom(id);
			seedRoom(room.doc, { name: trimmed, templateId });
			await goto(`/r/${id}`);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Failed to create room.';
			submitting = false;
		}
	}
</script>

<main>
	<p class="wordmark">loco_retro</p>
	<section class="card">
		<h1>Create a retro</h1>

		<form onsubmit={handleSubmit} novalidate>
		<label>
			<span>Room name</span>
			<input
				type="text"
				name="name"
				bind:value={name}
				placeholder="Sprint 42 retro"
				autocomplete="off"
				required
			/>
		</label>

		<label>
			<span>Template</span>
			<select name="templateId" bind:value={templateId}>
				{#each PRESET_TEMPLATES as template (template.id)}
					<option value={template.id}>{template.label}</option>
				{/each}
			</select>
		</label>

		{#if errorMsg}
			<p class="error" role="alert">{errorMsg}</p>
		{/if}

		<button type="submit" disabled={submitting}>
			{submitting ? 'Creating…' : 'Create retro'}
		</button>
	</form>
	</section>
</main>

<style>
	main {
		max-width: 32rem;
		margin: 5rem auto;
		padding: 0 1.5rem;
	}

	.wordmark {
		text-align: center;
		font-weight: 600;
		font-size: 0.875rem;
		letter-spacing: 0.08em;
		text-transform: lowercase;
		color: var(--color-muted);
		margin: 0 0 1.25rem;
	}

	.card {
		background: var(--color-surface);
		padding: 2.25rem 2.5rem 2.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-card);
	}

	h1 {
		margin: 0 0 1.5rem;
		font-size: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.125rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		font-weight: 500;
		font-size: 0.875rem;
	}

	input,
	select {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font-weight: 400;
		font-size: 1rem;
		background: var(--color-surface);
		color: var(--color-text);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	button {
		align-self: stretch;
		padding: 0.75rem 1.25rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.95rem;
		margin-top: 0.5rem;
		box-shadow: var(--shadow-button);
		transition:
			background 0.15s ease,
			transform 0.05s ease;
	}

	button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	button:active:not(:disabled) {
		transform: translateY(1px);
	}

	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.error {
		color: var(--color-danger);
		margin: 0;
		font-size: 0.875rem;
	}
</style>
