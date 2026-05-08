<script lang="ts">
	type Props = {
		kind: 'success' | 'error';
		message: string;
	};

	let { kind, message }: Props = $props();
</script>

<div class="toast toast-{kind}" role="status">
	<svg class="toast-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
		{#if kind === 'success'}
			<path
				d="M4 10.5l3.5 3.5L16 6"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{:else}
			<path
				d="M10 5v6M10 14v0.5"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linecap="round"
			/>
			<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6" />
		{/if}
	</svg>
	<span>{message}</span>
</div>

<style>
	.toast {
		position: fixed;
		bottom: 1.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		box-shadow: var(--shadow-card);
		border: 1px solid;
		z-index: 1000;
		animation: toast-in 0.18s ease-out;
	}

	.toast-icon {
		width: 1.125rem;
		height: 1.125rem;
		flex: none;
	}

	.toast-success {
		background: var(--color-success-soft);
		color: var(--color-success);
		border-color: var(--color-success);
	}

	.toast-error {
		background: var(--color-danger-soft);
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translate(-50%, 0.5rem);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}
</style>
