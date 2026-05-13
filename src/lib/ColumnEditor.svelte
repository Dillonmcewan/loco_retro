<script lang="ts">
	import { templateKeyFromTitles, deriveTemplateLabel, type Template } from '$lib/templates';
	import { MIN_COLUMNS, MAX_COLUMNS } from '$lib/room';
	import X from 'lucide-svelte/icons/x';

	type Props = {
		onSave: (t: Template, opts: { userNamed: boolean }) => void;
		onCancel: () => void;
	};

	let { onSave, onCancel }: Props = $props();

	let templateName = $state('');
	let titles = $state<string[]>(['']);
	let rowErrors = $state<boolean[]>([false]);
	let formError = $state<string | null>(null);

	function addRow() {
		if (titles.length >= MAX_COLUMNS) return;
		titles = [...titles, ''];
		rowErrors = [...rowErrors, false];
	}

	function removeRow(i: number) {
		if (titles.length <= MIN_COLUMNS) return;
		titles = titles.filter((_, idx) => idx !== i);
		rowErrors = rowErrors.filter((_, idx) => idx !== i);
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		const trimmed = titles.map((t) => t.trim());
		const nextRowErrors = trimmed.map((t) => t === '');
		const anyNonEmpty = trimmed.some((t) => t !== '');
		if (!anyNonEmpty) {
			rowErrors = nextRowErrors.map(() => true);
			formError = 'Add at least one column.';
			return;
		}
		const kept = trimmed.filter((t) => t !== '');
		if (kept.length < MIN_COLUMNS || kept.length > MAX_COLUMNS) {
			formError = `Templates must have ${MIN_COLUMNS}–${MAX_COLUMNS} columns.`;
			return;
		}
		rowErrors = nextRowErrors;
		formError = null;
		const name = templateName.trim();
		const label = name || deriveTemplateLabel(kept);
		const template: Template = {
			key: templateKeyFromTitles(kept),
			label,
			columns: kept.map((title) => ({ title }))
		};
		onSave(template, { userNamed: name.length > 0 });
	}
</script>

<form class="editor" onsubmit={handleSubmit} novalidate aria-label="Custom template editor">
	<label class="name-label">
		<span>Template name</span>
		<input
			type="text"
			bind:value={templateName}
			placeholder="Optional — leave blank to use column titles"
			autocomplete="off"
		/>
	</label>

	<fieldset class="columns">
		<legend>Columns</legend>
		<ul class="rows">
			{#each titles as _title, i (i)}
				<li class="row">
					<input
						type="text"
						bind:value={titles[i]}
						aria-label={`Column ${i + 1} title`}
						aria-invalid={rowErrors[i] ? 'true' : undefined}
						placeholder="Column title"
					/>
					<button
						type="button"
						class="remove"
						aria-label={`Remove column ${i + 1}`}
						onclick={() => removeRow(i)}
						disabled={titles.length <= MIN_COLUMNS}
					>
						<X />
					</button>
				</li>
			{/each}
		</ul>
		<button type="button" class="add" onclick={addRow} disabled={titles.length >= MAX_COLUMNS}>
			Add column
		</button>
	</fieldset>

	{#if formError}
		<span class="error" role="alert">{formError}</span>
	{/if}

	<div class="actions">
		<button type="button" class="secondary" onclick={onCancel}>Back</button>
		<button type="submit">Save template</button>
	</div>
</form>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	.name-label {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.name-label input,
	.row input {
		padding: var(--space-3) var(--space-3);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--font-size-md);
		font-weight: 400;
	}

	.row input[aria-invalid='true'] {
		border-color: var(--color-danger);
	}

	.columns {
		border: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.columns legend {
		font-weight: 500;
		font-size: var(--font-size-sm);
		margin-bottom: var(--space-2);
		padding: 0;
	}

	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.row {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.row input {
		flex: 1;
	}

	.remove {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		background: transparent;
		color: var(--color-muted);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.remove:hover:not(:disabled) {
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.remove :global(svg) {
		width: var(--icon-size-sm);
		height: var(--icon-size-sm);
	}

	.remove:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.add {
		align-self: flex-start;
		padding: var(--space-2) var(--space-4);
		background: transparent;
		color: var(--color-primary);
		border: 1px dashed var(--color-primary);
		border-radius: var(--radius-sm);
		font-weight: 500;
		font-size: var(--font-size-sm);
		cursor: pointer;
	}

	.add:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.actions {
		display: flex;
		gap: var(--space-3);
	}

	.actions button {
		flex: 1;
		padding: var(--space-3) var(--space-5);
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: var(--font-size-md);
		cursor: pointer;
	}

	.actions button.secondary {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border-strong);
	}

	.actions button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.actions button.secondary:hover {
		background: var(--color-surface-soft);
	}

	.error {
		color: var(--color-danger);
		font-size: var(--font-size-sm);
	}
</style>
