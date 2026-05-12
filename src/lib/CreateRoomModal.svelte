<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		generateRoomId,
		ensureRoom,
		leaveRoom,
		seedRoom,
		DEFAULT_VOTES_PER_PARTICIPANT,
		isValidVoteCount
	} from '$lib/room';
	import { PRESET_TEMPLATES, DEFAULT_TEMPLATE_ID } from '$lib/templates';
	import { upsertRoom } from '$lib/rooms';

	type Props = {
		open: boolean;
		onClose: () => void;
	};

	let { open, onClose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let name = $state('');
	let templateId = $state<string>(DEFAULT_TEMPLATE_ID);
	let votesPerParticipant = $state<number>(DEFAULT_VOTES_PER_PARTICIPANT);
	let submitting = $state(false);
	let fieldErrors = $state<{ roomName?: string; templateId?: string; votes?: string }>({});

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (open && !el.open) {
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	});

	function resetForm() {
		name = '';
		templateId = DEFAULT_TEMPLATE_ID;
		votesPerParticipant = DEFAULT_VOTES_PER_PARTICIPANT;
		submitting = false;
		fieldErrors = {};
	}

	function handleDialogClose() {
		resetForm();
		onClose();
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		fieldErrors = {};
		const trimmed = name.trim();
		if (!trimmed) {
			fieldErrors = { roomName: 'Room name is required.' };
			return;
		}
		if (!isValidVoteCount(votesPerParticipant)) {
			fieldErrors = { votes: 'Votes per participant must be a positive integer.' };
			return;
		}
		if (submitting) return;
		submitting = true;
		const id = generateRoomId();
		try {
			const room = ensureRoom(id);
			seedRoom(room.doc, { name: trimmed, templateId, votesPerParticipant });
			upsertRoom({ id, name: trimmed, templateId, lastOpenedAt: Date.now() });
			await goto(`/r/${id}`);
		} catch (err) {
			leaveRoom();
			const message = err instanceof Error ? err.message : 'Failed to create room.';
			fieldErrors = { roomName: message };
			submitting = false;
		}
	}
</script>

<dialog bind:this={dialogEl} onclose={handleDialogClose} aria-labelledby="create-room-title">
	<div class="content">
		<h1 id="create-room-title">Create a retro</h1>

		<form onsubmit={handleSubmit} novalidate>
			<label>
				<span>Room name</span>
				<input
					type="text"
					name="room-name"
					bind:value={name}
					placeholder="Sprint 42 retro"
					autocomplete="off"
					data-1p-ignore
					data-lpignore="true"
					data-form-type="other"
					aria-invalid={!!fieldErrors.roomName}
					aria-describedby={fieldErrors.roomName ? 'room-name-error' : undefined}
					required
				/>
				{#if fieldErrors.roomName}
					<span id="room-name-error" class="error" role="alert">{fieldErrors.roomName}</span>
				{/if}
			</label>

			<fieldset class="template-picker">
				<legend>Template</legend>
				<div class="template-grid">
					{#each PRESET_TEMPLATES as template (template.id)}
						<label class="template-card" class:selected={templateId === template.id}>
							<input type="radio" name="templateId" value={template.id} bind:group={templateId} />
							<span class="template-name">{template.label}</span>
							<span class="template-cols">
								{#each template.columns as col (col.id)}
									<span class="col-chip">{col.title}</span>
								{/each}
							</span>
						</label>
					{/each}
				</div>
				{#if fieldErrors.templateId}
					<span class="error" role="alert">{fieldErrors.templateId}</span>
				{/if}
			</fieldset>

			<label>
				<span>Votes per participant</span>
				<input
					type="number"
					name="votes-per-participant"
					min="1"
					step="1"
					bind:value={votesPerParticipant}
					aria-invalid={!!fieldErrors.votes}
					aria-describedby={fieldErrors.votes ? 'votes-error' : undefined}
					required
				/>
				{#if fieldErrors.votes}
					<span id="votes-error" class="error" role="alert">{fieldErrors.votes}</span>
				{/if}
			</label>

			<div class="actions">
				<button type="button" class="secondary" onclick={() => dialogEl?.close()}>Cancel</button>
				<button type="submit" disabled={submitting}>
					{submitting ? 'Creating…' : 'Create retro'}
				</button>
			</div>
		</form>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(36rem, 100vw - var(--space-8));
		width: 100%;
		max-height: calc(100vh - var(--space-12));
		overflow: visible;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.4);
	}

	.content {
		background: var(--color-surface);
		padding: var(--space-8) var(--space-10) var(--space-10);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-card);
		max-height: calc(100vh - var(--space-12));
		overflow-y: auto;
	}

	h1 {
		margin: 0 0 var(--space-6);
		font-size: var(--font-size-xl);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	input[type='text'],
	input[type='number'] {
		padding: var(--space-3) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		font-weight: 400;
		font-size: var(--font-size-md);
		background: var(--color-surface);
		color: var(--color-text);
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	input[type='text']:focus,
	input[type='number']:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px var(--color-primary-soft);
	}

	input[type='text'][aria-invalid='true'],
	input[type='number'][aria-invalid='true'] {
		border-color: var(--color-danger);
	}

	input[type='text'][aria-invalid='true']:focus,
	input[type='number'][aria-invalid='true']:focus {
		box-shadow: 0 0 0 3px var(--color-danger-soft);
	}

	.template-picker {
		border: none;
		padding: 0;
		margin: 0;
	}

	.template-picker legend {
		font-weight: 500;
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-2);
		padding: 0;
	}

	.template-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: var(--space-3);
	}

	.template-card {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-4);
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

	.template-card input {
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
		font-size: var(--font-size-md);
		line-height: 1.3;
	}

	.template-cols {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1);
	}

	.col-chip {
		padding: var(--space-1) var(--space-2);
		background: var(--color-surface-soft);
		color: var(--color-muted);
		border-radius: 1rem;
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	.template-card.selected .col-chip {
		background: white;
		color: var(--color-text);
	}

	.actions {
		display: flex;
		gap: var(--space-3);
		margin-top: var(--space-2);
	}

	button {
		flex: 1;
		padding: var(--space-3) var(--space-5);
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--font-size-md);
		box-shadow: var(--shadow-button);
		cursor: pointer;
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

	button.secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
		box-shadow: none;
	}

	button.secondary:hover {
		background: var(--color-surface-soft);
	}

	.error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
		margin-top: var(--space-1);
	}
</style>
