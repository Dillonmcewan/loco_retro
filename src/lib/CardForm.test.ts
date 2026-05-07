import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import CardForm from './CardForm.svelte';

function setup() {
	const onSubmit = vi.fn();
	const utils = render(CardForm, { props: { columnId: 'col-1', onSubmit } });
	const textarea = screen.getByRole('textbox', { name: /new card text/i }) as HTMLTextAreaElement;
	const button = screen.getByRole('button', { name: /add/i }) as HTMLButtonElement;
	return { ...utils, onSubmit, textarea, button };
}

describe('CardForm.svelte', () => {
	it('blocks submit when empty', async () => {
		const user = userEvent.setup();
		const { onSubmit, button } = setup();
		expect(button).toBeDisabled();
		await user.click(button);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('blocks submit on whitespace-only input', async () => {
		const user = userEvent.setup();
		const { onSubmit, textarea, button } = setup();
		await user.type(textarea, '   ');
		expect(button).toBeDisabled();
		await user.click(button);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('submits the trimmed text and clears the textarea', async () => {
		const user = userEvent.setup();
		const { onSubmit, textarea, button } = setup();
		await user.type(textarea, '  needs more tests  ');
		await user.click(button);
		expect(onSubmit).toHaveBeenCalledWith('needs more tests');
		expect(textarea.value).toBe('');
	});

	it('Enter submits', async () => {
		const user = userEvent.setup();
		const { onSubmit, textarea } = setup();
		await user.type(textarea, 'hi{Enter}');
		expect(onSubmit).toHaveBeenCalledWith('hi');
		expect(textarea.value).toBe('');
	});

	it('Shift+Enter inserts a newline without submitting', async () => {
		const user = userEvent.setup();
		const { onSubmit, textarea } = setup();
		await user.type(textarea, 'line one{Shift>}{Enter}{/Shift}line two');
		expect(onSubmit).not.toHaveBeenCalled();
		expect(textarea.value).toBe('line one\nline two');
	});
});
