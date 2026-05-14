import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';

import CardSelector from './CardSelector.svelte';

function content(text = 'option') {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

function rootButton(container: ParentNode): HTMLButtonElement {
	const btn = container.querySelector('button.card-selector');
	if (!btn) throw new Error('expected a .card-selector button');
	return btn as HTMLButtonElement;
}

describe('CardSelector', () => {
	it('default render: no modifier classes, no aria-pressed', () => {
		const { container } = render(CardSelector, { children: content() });
		const btn = rootButton(container);
		expect(btn.classList.contains('card-selector')).toBe(true);
		expect(btn.classList.contains('is-selected')).toBe(false);
		expect(btn.classList.contains('is-dashed')).toBe(false);
		expect(btn.hasAttribute('aria-pressed')).toBe(false);
	});

	it('selected={true} adds .is-selected and aria-pressed="true"', () => {
		const { container } = render(CardSelector, { selected: true, children: content() });
		const btn = rootButton(container);
		expect(btn.classList.contains('is-selected')).toBe(true);
		expect(btn.getAttribute('aria-pressed')).toBe('true');
	});

	it('selected={false} surfaces aria-pressed="false" without attaching .is-selected', () => {
		const { container } = render(CardSelector, { selected: false, children: content() });
		const btn = rootButton(container);
		expect(btn.classList.contains('is-selected')).toBe(false);
		expect(btn.getAttribute('aria-pressed')).toBe('false');
	});

	it('variant="dashed" adds .is-dashed', () => {
		const { container } = render(CardSelector, { variant: 'dashed', children: content() });
		const btn = rootButton(container);
		expect(btn.classList.contains('is-dashed')).toBe(true);
	});

	it('onclick fires on click', async () => {
		const onclick = vi.fn();
		const user = userEvent.setup();
		const { container } = render(CardSelector, { onclick, children: content() });
		await user.click(rootButton(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});
});
