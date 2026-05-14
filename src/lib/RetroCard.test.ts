import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
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
		discussed: boolean;
	}> = {}
) {
	const onEdit = vi.fn();
	const onDelete = vi.fn();
	const onToggleDiscussed = vi.fn();
	const props = {
		card: overrides.card ?? baseCard,
		currentAuthorId: overrides.currentAuthorId ?? 'author-1',
		phase: overrides.phase ?? ('collect' as Phase),
		onEdit,
		onDelete,
		voteTotal: overrides.voteTotal ?? 0,
		discussed: overrides.discussed ?? false,
		onToggleDiscussed
	};
	return { ...render(RetroCard, { props }), onEdit, onDelete, onToggleDiscussed };
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

	it('does not render the discussed toggle during collect or vote', () => {
		const { unmount } = setup({ phase: 'collect' });
		expect(screen.queryByRole('button', { name: /mark as discussed/i })).not.toBeInTheDocument();
		unmount();
		setup({ phase: 'vote' });
		expect(screen.queryByRole('button', { name: /mark as discussed/i })).not.toBeInTheDocument();
	});

	it('renders the discussed toggle in discuss and fires onToggleDiscussed on click', async () => {
		const user = userEvent.setup();
		const { onToggleDiscussed } = setup({ phase: 'discuss' });
		const btn = screen.getByRole('button', { name: /mark as discussed/i });
		expect(btn).toBeEnabled();
		await user.click(btn);
		expect(onToggleDiscussed).toHaveBeenCalledOnce();
	});

	it('toggle reflects discussed=true with aria-pressed and "not discussed" label', () => {
		setup({ phase: 'discuss', discussed: true });
		const btn = screen.getByRole('button', { name: /mark as not discussed/i });
		expect(btn).toHaveAttribute('aria-pressed', 'true');
	});

	it('adds the discussed class hook on the outer card when discussed=true', () => {
		const { container } = setup({ phase: 'discuss', discussed: true });
		expect(container.querySelector('.retro-card.discussed')).not.toBeNull();
	});

	it('closed phase: discussed card shows a static indicator with no toggle button', () => {
		const { container } = setup({ phase: 'closed', discussed: true });
		expect(
			screen.queryByRole('button', { name: /mark as (not )?discussed/i })
		).not.toBeInTheDocument();
		expect(container.querySelector('.discussed-indicator')).not.toBeNull();
	});

	it('closed phase: non-discussed card shows neither indicator nor toggle', () => {
		const { container } = setup({ phase: 'closed', discussed: false });
		expect(
			screen.queryByRole('button', { name: /mark as (not )?discussed/i })
		).not.toBeInTheDocument();
		expect(container.querySelector('.discussed-indicator')).toBeNull();
	});

	it('applies the .animating class when discussed flips false → true', async () => {
		const onToggleDiscussed = vi.fn();
		const { container, rerender } = render(RetroCard, {
			props: {
				card: baseCard,
				currentAuthorId: 'author-1',
				phase: 'discuss' as Phase,
				onEdit: vi.fn(),
				onDelete: vi.fn(),
				voteTotal: 0,
				discussed: false,
				onToggleDiscussed
			}
		});
		await tick();
		expect(container.querySelector('.retro-card.animating')).toBeNull();

		await rerender({
			card: baseCard,
			currentAuthorId: 'author-1',
			phase: 'discuss' as Phase,
			onEdit: vi.fn(),
			onDelete: vi.fn(),
			voteTotal: 0,
			discussed: true,
			onToggleDiscussed
		});
		await tick();
		expect(container.querySelector('.retro-card.animating')).not.toBeNull();
	});

	it('does NOT apply .animating when mounted with discussed=true (initial-load skip)', async () => {
		const { container } = setup({ phase: 'discuss', discussed: true });
		await tick();
		expect(container.querySelector('.retro-card.animating')).toBeNull();
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
