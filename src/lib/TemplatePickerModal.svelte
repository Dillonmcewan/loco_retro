<script lang="ts">
	import { aggregatedTemplates, type Template } from '$lib/templates';
	import { listRooms } from '$lib/rooms';
	import ColumnEditor from '$lib/ColumnEditor.svelte';

	type Props = {
		open: boolean;
		onSelect: (t: Template) => void;
		onClose: () => void;
	};

	let { open, onSelect, onClose }: Props = $props();

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let yours = $state<Template[]>([]);
	let presets = $state<Template[]>([]);
	let editorOpen = $state(false);

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (open && !el.open) {
			const agg = aggregatedTemplates(listRooms());
			yours = agg.yours;
			presets = agg.presets;
			editorOpen = false;
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	});

	function handleClose() {
		editorOpen = false;
		onClose();
	}

	function selectTemplate(t: Template) {
		onSelect(t);
	}

	function handleEditorSave(t: Template) {
		onSelect(t);
	}
</script>

<dialog bind:this={dialogEl} onclose={handleClose} aria-labelledby="template-picker-title">
	<div class="content">
		<h2 id="template-picker-title">Choose a template</h2>

		{#if editorOpen}
			<ColumnEditor onSave={handleEditorSave} onCancel={() => (editorOpen = false)} />
		{:else}
			{#if yours.length > 0}
				<section aria-labelledby="yours-heading" class="section">
					<h3 id="yours-heading">Yours</h3>
					<ul class="list">
						{#each yours as t (t.key)}
							<li>
								<button type="button" class="row" onclick={() => selectTemplate(t)}>
									<span class="row-label">{t.label}</span>
									<span class="row-cols">
										{#each t.columns as c, i (i)}
											<span class="col-chip">{c.title}</span>
										{/each}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section aria-labelledby="presets-heading" class="section">
				<h3 id="presets-heading">Presets</h3>
				<ul class="list">
					{#each presets as t (t.key)}
						<li>
							<button type="button" class="row" onclick={() => selectTemplate(t)}>
								<span class="row-label">{t.label}</span>
								<span class="row-cols">
									{#each t.columns as c, i (i)}
										<span class="col-chip">{c.title}</span>
									{/each}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>

			<div class="actions">
				<button type="button" class="secondary" onclick={() => dialogEl?.close()}>Cancel</button>
				<button type="button" onclick={() => (editorOpen = true)}>Create new template</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(40rem, 100vw - var(--space-8));
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
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	h2 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.section h3 {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.row {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-md);
		text-align: left;
		cursor: pointer;
		font: inherit;
		color: inherit;
		transition:
			border-color 0.12s ease,
			background 0.12s ease;
	}

	.row:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-soft);
	}

	.row-label {
		font-weight: 600;
		font-size: var(--font-size-md);
	}

	.row-cols {
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
</style>
