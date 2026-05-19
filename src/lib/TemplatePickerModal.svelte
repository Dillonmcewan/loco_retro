<script lang="ts">
	import { aggregatedTemplates, type Template } from '$lib/templates';
	import { listRooms } from '$lib/rooms';
	import CardSelector from '$lib/CardSelector.svelte';
	import ColumnEditor from '$lib/ColumnEditor.svelte';
	import Modal from '$lib/Modal.svelte';
	import Plus from '@lucide/svelte/icons/plus';

	type Props = {
		open: boolean;
		onSelect: (t: Template) => void;
		onClose: () => void;
	};

	let { open, onSelect, onClose }: Props = $props();

	let yours = $state<Template[]>([]);
	let presets = $state<Template[]>([]);
	let editorOpen = $state(false);

	$effect(() => {
		if (open) {
			const agg = aggregatedTemplates(listRooms());
			yours = agg.yours;
			presets = agg.presets;
			editorOpen = false;
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

<Modal
	{open}
	onClose={handleClose}
	labelledBy="template-picker-title"
	maxWidth="40rem"
	scrollable
	dismissOnBackdrop={!editorOpen}
	showCloseButton={!editorOpen}
>
	{#snippet children(_)}
		<h2 id="template-picker-title">{editorOpen ? 'Create new template' : 'Choose a template'}</h2>

		{#if editorOpen}
			<ColumnEditor onSave={handleEditorSave} onCancel={() => (editorOpen = false)} />
		{:else}
			<section aria-labelledby="custom-heading" class="section">
				<h3 id="custom-heading">Custom</h3>
				<div class="template-grid">
					{#each yours as t (t.key)}
						<CardSelector onclick={() => selectTemplate(t)}>
							<span class="template-name">{t.label}</span>
							<span class="template-cols">
								{#each t.columns as c, i (i)}
									<span class="col-chip">{c.title}</span>
								{/each}
							</span>
						</CardSelector>
					{/each}
					<CardSelector
						variant="dashed"
						ariaLabel="Create new template"
						onclick={() => (editorOpen = true)}
					>
						<Plus />
						<span class="template-name">New template</span>
					</CardSelector>
				</div>
			</section>

			<section aria-labelledby="presets-heading" class="section">
				<h3 id="presets-heading">Presets</h3>
				<div class="template-grid">
					{#each presets as t (t.key)}
						<CardSelector onclick={() => selectTemplate(t)}>
							<span class="template-name">{t.label}</span>
							<span class="template-cols">
								{#each t.columns as c, i (i)}
									<span class="col-chip">{c.title}</span>
								{/each}
							</span>
						</CardSelector>
					{/each}
				</div>
			</section>
		{/if}
	{/snippet}
</Modal>

<style>
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
</style>
