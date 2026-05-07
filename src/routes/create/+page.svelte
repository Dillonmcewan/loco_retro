<script lang="ts">
	import { goto } from '$app/navigation';
	import { generateRoomId } from '$lib/room/id';
	import { ensureRoom } from '$lib/room/store';
	import { seedRoom } from '$lib/room/seed';
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
</main>

<style>
	main {
		max-width: 32rem;
		margin: 4rem auto;
		padding: 0 1.5rem;
	}

	h1 {
		margin: 0 0 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-weight: 500;
	}

	input,
	select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
		font-weight: 400;
	}

	button {
		align-self: flex-start;
		padding: 0.625rem 1.25rem;
		background: #1a1a1a;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-weight: 500;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #b00020;
		margin: 0;
	}
</style>
