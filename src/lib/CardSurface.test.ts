import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';

import CardSurface from './CardSurface.svelte';

function content(text = 'card') {
	return createRawSnippet(() => ({
		render: () => `<span>${text}</span>`
	}));
}

describe('CardSurface', () => {
	it('renders as a <button type="button">', () => {
		const { container } = render(CardSurface, { children: content() });
		const button = container.querySelector('button.card-surface');
		expect(button).not.toBeNull();
		expect(button?.getAttribute('type')).toBe('button');
	});

	it('disabled blocks the onclick handler', async () => {
		const onclick = vi.fn();
		const user = userEvent.setup();
		const { container } = render(CardSurface, {
			disabled: true,
			onclick,
			children: content()
		});
		await user.click(container.querySelector('button.card-surface') as HTMLElement);
		expect(onclick).not.toHaveBeenCalled();
	});

	it('ariaPressed={true} surfaces aria-pressed="true"', () => {
		const { container } = render(CardSurface, { ariaPressed: true, children: content() });
		const button = container.querySelector('button.card-surface');
		expect(button?.getAttribute('aria-pressed')).toBe('true');
	});

	it('omitting ariaPressed leaves the button with no aria-pressed attribute', () => {
		const { container } = render(CardSurface, { children: content() });
		const button = container.querySelector('button.card-surface');
		expect(button?.hasAttribute('aria-pressed')).toBe(false);
	});

	it('variant="dashed" adds the dashed class', () => {
		const { container } = render(CardSurface, { variant: 'dashed', children: content() });
		const button = container.querySelector('button.card-surface');
		expect(button?.classList.contains('dashed')).toBe(true);
	});

	it('passes the class prop through to the button root', () => {
		const { container } = render(CardSurface, { class: 'extra-class', children: content() });
		const button = container.querySelector('button.card-surface');
		expect(button?.classList.contains('card-surface')).toBe(true);
		expect(button?.classList.contains('extra-class')).toBe(true);
	});
});
