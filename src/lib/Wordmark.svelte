<script lang="ts">
	type Props = { size?: 'sm' | 'md' };
	let { size = 'md' }: Props = $props();
</script>

<span class="wordmark" class:sm={size === 'sm'} aria-label="LocoRetro">
	<span class="loco">Loco</span><span class="retro">Retro</span>
</span>

<style>
	.wordmark {
		display: inline-flex;
		align-items: baseline;
		font-weight: 800;
		font-size: var(--font-size-xl);
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.wordmark.sm {
		font-size: var(--font-size-md);
	}

	.loco {
		color: var(--color-primary);
	}

	.retro {
		color: var(--color-secondary);
	}
</style>
