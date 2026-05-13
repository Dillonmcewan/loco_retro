<script lang="ts">
	import { aggregatedTemplates, type Template } from '$lib/templates';
	import { listRooms } from '$lib/rooms';
	import ColumnEditor from '$lib/ColumnEditor.svelte';
	import Plus from 'lucide-svelte/icons/plus';

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
		<h2 id="template-picker-title">{editorOpen ? 'Create new template' : 'Choose a template'}</h2>

		{#if editorOpen}
			<ColumnEditor onSave={handleEditorSave} onCancel={() => (editorOpen = false)} />
		{:else}
			<section aria-labelledby="custom-heading" class="section">
				<h3 id="custom-heading">Custom</h3>
				<div class="template-grid">
					{#each yours as t (t.key)}
						<button type="button" class="template-card" onclick={() => selectTemplate(t)}>
							<span class="template-name">{t.label}</span>
							<span class="template-cols">
								{#each t.columns as c, i (i)}
									<span class="col-chip">{c.title}</span>
								{/each}
							</span>
						</button>
					{/each}
					<button
						type="button"
						class="template-card new-template"
						onclick={() => (editorOpen = true)}
						aria-label="Create new template"
					>
						<Plus />
						<span class="template-name">New template</span>
					</button>
				</div>
			</section>

			<section aria-labelledby="presets-heading" class="section">
				<h3 id="presets-heading">Presets</h3>
				<div class="template-grid">
					{#each presets as t (t.key)}
						<button type="button" class="template-card" onclick={() => selectTemplate(t)}>
							<span class="template-name">{t.label}</span>
							<span class="template-cols">
								{#each t.columns as c, i (i)}
									<span class="col-chip">{c.title}</span>
								{/each}
							</span>
						</button>
					{/each}
				</div>
			</section>

			<div class="actions">
				<button type="button" class="secondary" onclick={() => dialogEl?.close()}>Cancel</button>
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
		text-align: left;
		font: inherit;
		color: inherit;
		transition:
			border-color 0.12s ease,
			background 0.12s ease,
			box-shadow 0.12s ease,
			transform 0.05s ease;
	}

	.template-card:hover {
		border-color: var(--color-primary);
		box-shadow: 0 4px 12px -4px rgba(255, 107, 91, 0.18);
		transform: translateY(-1px);
	}

	.template-card.new-template {
		border-style: dashed;
		justify-content: center;
		align-items: center;
		text-align: center;
		color: var(--color-muted);
		gap: var(--space-2);
	}

	.template-card.new-template :global(svg) {
		width: var(--icon-size-md);
		height: var(--icon-size-md);
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
