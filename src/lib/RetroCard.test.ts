import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import RetroCard from './RetroCard.svelte';
import type { Card as CardType, Phase } from './room';

const baseCard: CardType = {
	id: 'card-1',
	text: 'hello world',
	author: 'Dillon',
	authorId: 'author-1',
	createdAt: 0
};

function setup(
	overrides: Partial<{
		card: CardType;
		currentAuthorId: string;
		phase: Phase;
		voteTotal: number;
	}> = {}
) {
	const onEdit = vi.fn();
	const onDelete = vi.fn();
	const props = {
		card: overrides.card ?? baseCard,
		currentAuthorId: overrides.currentAuthorId ?? 'author-1',
		phase: overrides.phase ?? ('collect' as Phase),
		onEdit,
		onDelete,
		voteTotal: overrides.voteTotal ?? 0
	};
	return { ...render(RetroCard, { props }), onEdit, onDelete };
}

describe('RetroCard.svelte', () => {
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
		await user.click(screen.getByRole('button', { name: /save changes/i }));

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
		await user.click(screen.getByRole('button', { name: /cancel edit/i }));

		expect(onEdit).not.toHaveBeenCalled();
		expect(screen.getByText('hello world')).toBeInTheDocument();
	});

	it('hides edit and delete outside collect even for the author', () => {
		setup({ phase: 'vote' });
		expect(screen.queryByRole('button', { name: /edit card/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /delete card/i })).not.toBeInTheDocument();
	});

	it('hides edit and delete on closed', () => {
		setup({ phase: 'closed' });
		expect(screen.queryByRole('button', { name: /edit card/i })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /delete card/i })).not.toBeInTheDocument();
	});

	it('clicking delete fires onDelete', async () => {
		const user = userEvent.setup();
		const { onDelete } = setup();
		await user.click(screen.getByRole('button', { name: /delete card/i }));
		expect(onDelete).toHaveBeenCalledOnce();
	});

	it('hides the aggregate vote badge during collect and vote', () => {
		const { unmount } = setup({ phase: 'collect', voteTotal: 4 });
		expect(screen.queryByLabelText(/total votes/i)).not.toBeInTheDocument();
		unmount();

		setup({ phase: 'vote', voteTotal: 4 });
		expect(screen.queryByLabelText(/total votes/i)).not.toBeInTheDocument();
	});

	it('shows the aggregate vote badge in discuss and closed when voteTotal > 0', () => {
		const { unmount } = setup({ phase: 'discuss', voteTotal: 3 });
		expect(screen.getByLabelText(/total votes/i)).toHaveTextContent(/Votes:\s*3/);
		unmount();

		setup({ phase: 'closed', voteTotal: 7 });
		expect(screen.getByLabelText(/total votes/i)).toHaveTextContent(/Votes:\s*7/);
	});

	it('hides the aggregate vote badge when voteTotal is 0 even in discuss', () => {
		setup({ phase: 'discuss', voteTotal: 0 });
		expect(screen.queryByLabelText(/total votes/i)).not.toBeInTheDocument();
	});

	it('renders the votingSlot snippet when provided', () => {
		const votingSlot = createRawSnippet(() => ({
			render: () => '<span data-testid="voting-slot">slot</span>'
		}));
		render(RetroCard, {
			props: {
				card: baseCard,
				currentAuthorId: 'author-1',
				phase: 'vote' as Phase,
				onEdit: vi.fn(),
				onDelete: vi.fn(),
				voteTotal: 0,
				votingSlot
			}
		});
		expect(screen.getByTestId('voting-slot')).toBeInTheDocument();
	});
});
