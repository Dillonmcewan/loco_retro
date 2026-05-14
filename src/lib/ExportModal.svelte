<script lang="ts">
	import CardSelector from '$lib/CardSelector.svelte';
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

	let dialogEl = $state<HTMLDialogElement | null>(null);
	let selected = $state<ExportFormat | null>(null);

	$effect(() => {
		const el = dialogEl;
		if (!el) return;
		if (open && !el.open) {
			selected = null;
			el.showModal();
		} else if (!open && el.open) {
			el.close();
		}
	});

	function pick(f: ExportFormat) {
		selected = f;
	}

	function handleClose() {
		onClose();
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

<dialog bind:this={dialogEl} onclose={handleClose} aria-labelledby="export-title">
	<div class="content">
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
			<button type="button" class="secondary" onclick={() => dialogEl?.close()}>Cancel</button>
			<button type="button" onclick={handleConfirm} disabled={!selected}>Export</button>
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		padding: 0;
		background: transparent;
		max-width: min(34rem, 100vw - var(--space-8));
		width: 100%;
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
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

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
