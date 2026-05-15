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
	import { recentTemplates, DEFAULT_TEMPLATE, isPresetKey, type Template } from '$lib/templates';
	import { listRooms, upsertRoom } from '$lib/rooms';
	import CardSelector from '$lib/CardSelector.svelte';
	import Modal from '$lib/Modal.svelte';
	import TemplatePickerModal from '$lib/TemplatePickerModal.svelte';
	import { tooltip } from '$lib/tooltip';
	import InfinityIcon from 'lucide-svelte/icons/infinity';
	import HelpCircle from 'lucide-svelte/icons/help-circle';

	type Props = {
		open: boolean;
		onClose: () => void;
	};

	let { open, onClose }: Props = $props();

	let nameInputEl = $state<HTMLInputElement | null>(null);
	let name = $state('');
	const initialRecents = recentTemplates(listRooms(), 3);
	let recents = $state<Template[]>(initialRecents);
	let selectedTemplate = $state<Template>(initialRecents[0] ?? DEFAULT_TEMPLATE);
	let votesPerParticipant = $state<number>(DEFAULT_VOTES_PER_PARTICIPANT);
	let chrisMode = $state(false);
	let submitting = $state(false);
	let fieldErrors = $state<{ roomName?: string; votes?: string }>({});
	let pickerOpen = $state(false);

	$effect(() => {
		if (!open) return;
		// Compute fresh values into locals before assigning, so the effect's only
		// reactive read is `open` itself — otherwise reading `recents[0]` after
		// writing `recents` makes `recents` a dependency and the effect re-fires
		// in a loop.
		const fresh = recentTemplates(listRooms(), 3);
		const initial = fresh[0] ?? DEFAULT_TEMPLATE;
		recents = fresh;
		selectedTemplate = initial;
		requestAnimationFrame(() => {
			nameInputEl?.focus();
		});
	});

	function resetForm() {
		name = '';
		selectedTemplate = DEFAULT_TEMPLATE;
		votesPerParticipant = DEFAULT_VOTES_PER_PARTICIPANT;
		chrisMode = false;
		submitting = false;
		fieldErrors = {};
		pickerOpen = false;
	}

	function handleDialogClose() {
		resetForm();
		onClose();
	}

	function selectRecent(t: Template) {
		selectedTemplate = t;
	}

	function handlePickerSelect(t: Template) {
		selectedTemplate = t;
		// Promote into recents so the user immediately sees it.
		recents = [t, ...recents.filter((r) => r.key !== t.key)].slice(0, 3);
		pickerOpen = false;
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		fieldErrors = {};
		const trimmed = name.trim();
		if (!trimmed) {
			fieldErrors = { roomName: 'Room name is required.' };
			return;
		}
		if (!chrisMode && !isValidVoteCount(votesPerParticipant)) {
			fieldErrors = { votes: 'Votes per participant must be a positive integer.' };
			return;
		}
		if (submitting) return;
		submitting = true;
		const id = generateRoomId();
		try {
			const room = ensureRoom(id);
			const columns = selectedTemplate.columns.map((c) => ({ title: c.title }));
			seedRoom(room.doc, { name: trimmed, columns, votesPerParticipant, chrisMode });
			const columnTitles = columns.map((c) => c.title);
			const templateName =
				selectedTemplate.userNamed && !isPresetKey(selectedTemplate.key)
					? selectedTemplate.label
					: undefined;
			upsertRoom({
				id,
				name: trimmed,
				columnTitles,
				templateName,
				lastOpenedAt: Date.now()
			});
			await goto(`/r/${id}`);
		} catch (err) {
			leaveRoom();
			const message = err instanceof Error ? err.message : 'Failed to create room.';
			fieldErrors = { roomName: message };
			submitting = false;
		}
	}
</script>

<Modal
	{open}
	onClose={handleDialogClose}
	labelledBy="create-room-title"
	maxWidth="36rem"
	scrollable
>
	<h1 id="create-room-title">Create a retro</h1>

	<form onsubmit={handleSubmit} novalidate>
		<label>
			<span>Room name</span>
			<input
				type="text"
				name="room-name"
				bind:this={nameInputEl}
				bind:value={name}
				placeholder="Name this retro"
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
				{#each recents as template (template.key)}
					<CardSelector
						selected={selectedTemplate.key === template.key}
						onclick={() => selectRecent(template)}
					>
						<span class="template-name">{template.label}</span>
						<span class="template-cols">
							{#each template.columns as col, i (i)}
								<span class="col-chip">{col.title}</span>
							{/each}
						</span>
					</CardSelector>
				{/each}
				<CardSelector variant="dashed" onclick={() => (pickerOpen = true)}>
					<span class="template-name">More templates…</span>
					<span class="more-sub">Browse all, or create your own</span>
				</CardSelector>
			</div>
		</fieldset>

		<div class="votes-block">
			<label for="votes-per-participant" class="votes-header">Votes per participant</label>
			<div class="votes-row">
				<span class="votes-input-wrap" class:chris={chrisMode}>
					<input
						id="votes-per-participant"
						type="number"
						name="votes-per-participant"
						min="1"
						step="1"
						bind:value={votesPerParticipant}
						aria-invalid={!chrisMode && !!fieldErrors.votes}
						aria-describedby={fieldErrors.votes ? 'votes-error' : undefined}
						disabled={chrisMode}
						required={!chrisMode}
					/>
					{#if chrisMode}
						<span class="infinity-overlay" aria-hidden="true">
							<InfinityIcon />
						</span>
					{/if}
				</span>
				<div class="chris-cell">
					<label
						class="chris-checkbox"
						use:tooltip={"Everything's made up and the points don't matter"}
					>
						<input type="checkbox" bind:checked={chrisMode} />
						<span>Chris mode</span>
					</label>
					<button
						type="button"
						class="chris-help"
						aria-label="What is Chris mode?"
						use:tooltip={{
							text: 'You can never have too many votes! Participants get unlimited votes',
							delay: 2000,
							showOnClick: true
						}}
					>
						<HelpCircle />
					</button>
				</div>
			</div>
			{#if fieldErrors.votes && !chrisMode}
				<span id="votes-error" class="error" role="alert">{fieldErrors.votes}</span>
			{/if}
		</div>

		<div class="actions">
			<button type="button" class="secondary" onclick={onClose}>Cancel</button>
			<button type="submit" disabled={submitting}>
				{submitting ? 'Creating…' : 'Create retro'}
			</button>
		</div>
	</form>
</Modal>

<TemplatePickerModal
	open={pickerOpen}
	onSelect={handlePickerSelect}
	onClose={() => (pickerOpen = false)}
/>

<style>
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

	:global(.card-selector.is-selected) .col-chip {
		background: white;
		color: var(--color-text);
	}

	.more-sub {
		font-size: var(--font-size-xs);
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

	.actions button {
		flex: 1;
	}

	.error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
		margin-top: var(--space-1);
	}

	.votes-block {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.votes-header {
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.votes-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: var(--space-3);
	}

	.chris-cell {
		justify-self: center;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.chris-checkbox {
		display: inline-flex;
		flex-direction: row;
		align-items: center;
		gap: var(--space-2);
		font-weight: 500;
		font-size: var(--font-size-sm);
		cursor: pointer;
		user-select: none;
	}

	.chris-checkbox input {
		width: 1rem;
		height: 1rem;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	.chris-help {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		border-radius: 50%;
		transition: color 0.15s ease;
	}

	.chris-help:hover:not(:disabled),
	.chris-help:focus-visible {
		background: transparent;
		color: var(--color-text);
	}

	.chris-help:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.chris-help :global(svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}

	.votes-input-wrap {
		position: relative;
		display: block;
	}

	.votes-input-wrap input {
		width: 100%;
	}

	.votes-input-wrap input:disabled {
		background: var(--color-surface-soft);
		color: transparent;
		cursor: not-allowed;
	}

	.infinity-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		padding: 0 var(--space-3);
		color: var(--color-primary);
		pointer-events: none;
	}

	.infinity-overlay :global(svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
	}
</style>
