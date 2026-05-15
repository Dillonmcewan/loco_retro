<script lang="ts">
	import CardSelector from '$lib/CardSelector.svelte';
	import Modal from '$lib/Modal.svelte';
	import type { ExportFormat } from '$lib/exporters';
	import FileText from 'lucide-svelte/icons/file-text';
	import FileSpreadsheet from 'lucide-svelte/icons/file-spreadsheet';
	import FileType2 from 'lucide-svelte/icons/file-type-2';

	type Props = {
		open: boolean;
		onClose: () => void;
		onConfirm: (format: ExportFormat) => void;
	};

	let { open, onClose, onConfirm }: Props = $props();

	let selected = $state<ExportFormat | null>(null);

	$effect(() => {
		if (open) selected = null;
	});

	function pick(f: ExportFormat) {
		selected = f;
	}

	function handleConfirm() {
		if (!selected) return;
		onConfirm(selected);
	}

	const FORMATS: { key: ExportFormat; label: string; Icon: typeof FileText }[] = [
		{ key: 'pdf', label: 'PDF', Icon: FileType2 },
		{ key: 'csv', label: 'CSV', Icon: FileSpreadsheet },
		{ key: 'md', label: 'Markdown', Icon: FileText }
	];
</script>

<Modal
	{open}
	{onClose}
	labelledBy="export-title"
	maxWidth="34rem"
	dismissOnBackdrop
	showCloseButton
>
	{#snippet children(_)}
		<h2 id="export-title">Export retro</h2>

		<div class="format-grid">
			{#each FORMATS as f (f.key)}
				<CardSelector ariaLabel={f.label} selected={selected === f.key} onclick={() => pick(f.key)}>
					<span class="format-card-body">
						<f.Icon />
						<span class="format-name">{f.label}</span>
					</span>
				</CardSelector>
			{/each}
		</div>

		<div class="actions">
			<button type="button" onclick={handleConfirm} disabled={!selected}>Export</button>
		</div>
	{/snippet}
</Modal>

<style>
	h2 {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.format-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
	}

	/* Centered icon-over-label layout for export format options. */
	.format-card-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		text-align: center;
	}

	.format-card-body :global(svg) {
		width: var(--icon-size-lg);
		height: var(--icon-size-lg);
		color: var(--card-selector-accent);
	}

	.format-name {
		font-weight: 600;
		font-size: var(--font-size-md);
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

	.actions button:hover:not(:disabled) {
		background: var(--color-primary-hover);
	}

	.actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 32rem) {
		.format-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
