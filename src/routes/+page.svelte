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

		<fieldset class="template-picker">
			<legend>Template</legend>
			<div class="template-grid">
				{#each PRESET_TEMPLATES as template (template.id)}
					<label class="template-card" class:selected={templateId === template.id}>
						<input
							type="radio"
							name="templateId"
							value={template.id}
							bind:group={templateId}
						/>
						<span class="template-name">{template.label}</span>
						<span class="template-cols">
							{#each template.columns as col (col.id)}
								<span class="col-chip">{col.title}</span>
							{/each}
						</span>
					</label>
				{/each}
			</div>
		</fieldset>

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

	input[type='text'],
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

	input[type='text']:focus,
	select:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	.template-picker {
		border: none;
		padding: 0;
		margin: 0;
	}

	.template-picker legend {
		font-weight: 500;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		padding: 0;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: 0.625rem;
	}

	.template-card {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding: 0.875rem 1rem;
		background: var(--color-surface);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition:
			border-color 0.12s ease,
			background 0.12s ease,
			box-shadow 0.12s ease,
			transform 0.05s ease;
	}

	.template-card:hover:not(.selected) {
		border-color: var(--color-primary);
		box-shadow: 0 4px 12px -4px rgba(255, 107, 91, 0.18);
		transform: translateY(-1px);
	}

	.template-card.selected {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	/* No separate :focus-visible outline on the card — in a radio group the
	   focused card is always the selected card, and the .selected styling
	   (coral border + peach fill + ring) is the visual focus indicator. */

	.template-card input {
		/* Visually hide the native radio while keeping it focusable for
		   keyboard nav. The card carries the focus indicator. */
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		border: 0;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		outline: none;
	}

	.template-name {
		font-weight: 600;
		font-size: 0.95rem;
		line-height: 1.3;
	}

	.template-cols {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.col-chip {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface-soft);
		color: var(--color-muted);
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.template-card.selected .col-chip {
		background: white;
		color: var(--color-text);
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
