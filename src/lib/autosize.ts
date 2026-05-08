/**
 * Svelte action: makes a textarea grow with its content. Starts at one row
 * and reflows on input or whenever the bound value changes (so clearing the
 * field after submit shrinks it back). Pair with `resize: none` in CSS so
 * users can't drag.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function autosize(node: HTMLTextAreaElement, _value?: string) {
	const resize = () => {
		node.style.height = 'auto';
		node.style.height = `${node.scrollHeight}px`;
	};

	resize();
	node.addEventListener('input', resize);

	return {
		update: () => resize(),
		destroy: () => node.removeEventListener('input', resize)
	};
}
