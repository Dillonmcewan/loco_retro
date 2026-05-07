import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Card from './Card.svelte';
import type { Card as CardType } from './room';

const baseCard: CardType = {
	id: 'card-1',
	text: 'hello world',
	author: 'Dillon',
	authorId: 'author-1',
	createdAt: 0
};

function setup(overrides: Partial<{ card: CardType; currentAuthorId: string }> = {}) {
	const onEdit = vi.fn();
	const onDelete = vi.fn();
	const props = {
		card: overrides.card ?? baseCard,
		currentAuthorId: overrides.currentAuthorId ?? 'author-1',
		onEdit,
		onDelete
	};
	return { ...render(Card, { props }), onEdit, onDelete };
}

describe('Card.svelte', () => {
	it('renders card text and author', () => {
		setup();
		expect(screen.getByText('hello world')).toBeInTheDocument();
		expect(screen.getByText('Dillon')).toBeInTheDocument();
	});

	it('hides edit and delete when current viewer is not the author', () => {
		setup({ currentAuthorId: 'someone-else' });
		expect(screen.queryByRole('button', { name: /edit card/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /delete card/i })).not.toBeInTheDocument();
	});

	it('shows edit and delete when viewer matches authorId', () => {
		setup();
		expect(screen.getByRole('button', { name: /edit card/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /delete card/i })).toBeInTheDocument();
	});

	it('clicking edit reveals a textarea pre-filled with the current text', async () => {
		const user = userEvent.setup();
		setup();
		await user.click(screen.getByRole('button', { name: /edit card/i }));

		const textarea = screen.getByRole('textbox', { name: /edit card/i }) as HTMLTextAreaElement;
		expect(textarea.value).toBe('hello world');
	});

	it('save calls onEdit with the trimmed new text and exits edit mode', async () => {
		const user = userEvent.setup();
		const { onEdit } = setup();
		await user.click(screen.getByRole('button', { name: /edit card/i }));

		const textarea = screen.getByRole('textbox', { name: /edit card/i });
		await user.clear(textarea);
		await user.type(textarea, '  updated  ');
		await user.click(screen.getByRole('button', { name: /^save$/i }));

		expect(onEdit).toHaveBeenCalledWith('updated');
		expect(screen.queryByRole('textbox', { name: /edit card/i })).not.toBeInTheDocument();
	});

	it('cancel restores the original text without calling onEdit', async () => {
		const user = userEvent.setup();
		const { onEdit } = setup();
		await user.click(screen.getByRole('button', { name: /edit card/i }));

		const textarea = screen.getByRole('textbox', { name: /edit card/i });
		await user.clear(textarea);
		await user.type(textarea, 'never saved');
		await user.click(screen.getByRole('button', { name: /^cancel$/i }));

		expect(onEdit).not.toHaveBeenCalled();
		expect(screen.getByText('hello world')).toBeInTheDocument();
	});

	it('clicking delete fires onDelete', async () => {
		const user = userEvent.setup();
		const { onDelete } = setup();
		await user.click(screen.getByRole('button', { name: /delete card/i }));
		expect(onDelete).toHaveBeenCalledOnce();
	});
});
