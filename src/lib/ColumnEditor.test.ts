import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

import ColumnEditor from './ColumnEditor.svelte';
import { templateKeyFromTitles, type Template } from './templates';

describe('ColumnEditor', () => {
	it('starts with one row; remove is disabled', () => {
		render(ColumnEditor, { onSave: vi.fn(), onCancel: vi.fn() });
		expect(screen.getByLabelText(/column 1 title/i)).toBeInTheDocument();
		expect(screen.queryByLabelText(/column 2 title/i)).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: /remove column 1/i })).toBeDisabled();
	});

	it('Add column adds rows up to a max of 6', async () => {
		const user = userEvent.setup();
		render(ColumnEditor, { onSave: vi.fn(), onCancel: vi.fn() });
		const add = screen.getByRole('button', { name: /add column/i });
		for (let i = 2; i <= 6; i++) {
			await user.click(add);
			expect(screen.getByLabelText(new RegExp(`column ${i} title`, 'i'))).toBeInTheDocument();
		}
		expect(add).toBeDisabled();
	});

	it('Remove drops the specific row', async () => {
		const user = userEvent.setup();
		render(ColumnEditor, { onSave: vi.fn(), onCancel: vi.fn() });
		await user.click(screen.getByRole('button', { name: /add column/i }));
		await user.type(screen.getByLabelText(/column 1 title/i), 'First');
		await user.type(screen.getByLabelText(/column 2 title/i), 'Second');
		await user.click(screen.getByRole('button', { name: /remove column 1/i }));
		expect(screen.getByLabelText(/column 1 title/i)).toHaveValue('Second');
		expect(screen.queryByLabelText(/column 2 title/i)).not.toBeInTheDocument();
	});

	it('blocks save when every row is empty', async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(ColumnEditor, { onSave, onCancel: vi.fn() });
		await user.click(screen.getByRole('button', { name: /save template/i }));
		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('emits trimmed titles + derived label when no name is set', async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(ColumnEditor, { onSave, onCancel: vi.fn() });
		await user.click(screen.getByRole('button', { name: /add column/i }));
		await user.type(screen.getByLabelText(/column 1 title/i), '  Alpha  ');
		await user.type(screen.getByLabelText(/column 2 title/i), 'Beta');
		await user.click(screen.getByRole('button', { name: /save template/i }));

		const [t] = onSave.mock.calls[0] as [Template];
		expect(t.columns.map((c) => c.title)).toEqual(['Alpha', 'Beta']);
		expect(t.label).toBe('Alpha / Beta');
		expect(t.key).toBe(templateKeyFromTitles(['Alpha', 'Beta']));
		expect(t.userNamed).toBe(false);
	});

	it('emits the user-supplied template name as the label, with userNamed=true', async () => {
		const user = userEvent.setup();
		const onSave = vi.fn();
		render(ColumnEditor, { onSave, onCancel: vi.fn() });
		await user.type(screen.getByLabelText(/template name/i), 'My ritual');
		await user.type(screen.getByLabelText(/column 1 title/i), 'Only');
		await user.click(screen.getByRole('button', { name: /save template/i }));

		const [t] = onSave.mock.calls[0] as [Template];
		expect(t.label).toBe('My ritual');
		expect(t.userNamed).toBe(true);
	});

	it('clears the form error when the user adds or removes a row', async () => {
		const user = userEvent.setup();
		render(ColumnEditor, { onSave: vi.fn(), onCancel: vi.fn() });
		await user.click(screen.getByRole('button', { name: /save template/i }));
		expect(screen.getByRole('alert')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /add column/i }));
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
