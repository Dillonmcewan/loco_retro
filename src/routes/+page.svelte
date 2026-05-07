<script lang="ts">
	// Landing page: single CTA to /create. Keeping it spartan on purpose
	// — polish happens after the core flow lands.
</script>

<main>
	<h1>loco_retro</h1>
	<p>Local-first remote retros.</p>
	<a class="cta" href="/create">Create a retro</a>
</main>

<style>
	main {
		max-width: 32rem;
		margin: 6rem auto;
		padding: 0 1.5rem;
		text-align: center;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.5rem;
	}

	p {
		color: #555;
		margin: 0 0 2rem;
	}

	.cta {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #1a1a1a;
		color: white;
		text-decoration: none;
		border-radius: 0.375rem;
		font-weight: 500;
	}

	.cta:hover {
		background: #333;
	}
</style>
