import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';

import TemplatePickerModal from './TemplatePickerModal.svelte';
import { upsertRoom } from './rooms';
import { PRESET_TEMPLATES, templateKeyFromTitles, type Template } from './templates';

describe('TemplatePickerModal', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders all presets and hides Yours when history is empty', () => {
		render(TemplatePickerModal, {
			open: true,
			onSelect: vi.fn(),
			onClose: vi.fn()
		});
		expect(screen.getByRole('heading', { name: /choose a template/i })).toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: /^yours$/i })).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /^presets$/i })).toBeInTheDocument();
		for (const p of PRESET_TEMPLATES) {
			expect(
				screen.getByRole('button', { name: new RegExp(escapeRegex(p.label)) })
			).toBeInTheDocument();
		}
	});

	it('shows the Yours section when there are custom templates in history', () => {
		upsertRoom({
			id: '11111111-1111-4111-8111-111111111111',
			name: 'r',
			columnTitles: ['Mind', 'Body', 'Soul'],
			lastOpenedAt: 1
		});
		render(TemplatePickerModal, {
			open: true,
			onSelect: vi.fn(),
			onClose: vi.fn()
		});
		expect(screen.getByRole('heading', { name: /^yours$/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Mind \/ Body \/ Soul/ })).toBeInTheDocument();
	});

	it('clicking a preset row calls onSelect with the template', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(TemplatePickerModal, {
			open: true,
			onSelect,
			onClose: vi.fn()
		});
		const preset = PRESET_TEMPLATES[1];
		await user.click(screen.getByRole('button', { name: new RegExp(escapeRegex(preset.label)) }));
		expect(onSelect).toHaveBeenCalledTimes(1);
		const [t] = onSelect.mock.calls[0] as [Template];
		expect(t.key).toBe(preset.key);
		expect(t.userNamed).toBeFalsy();
	});

	it('preserves userNamed when selecting a named template from "Yours"', async () => {
		upsertRoom({
			id: '22222222-2222-4222-8222-222222222222',
			name: 'r',
			columnTitles: ['Alpha', 'Beta', 'Gamma'],
			templateName: 'My ritual',
			lastOpenedAt: 1
		});
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(TemplatePickerModal, { open: true, onSelect, onClose: vi.fn() });
		await user.click(screen.getByRole('button', { name: /My ritual/ }));
		const [t] = onSelect.mock.calls[0] as [Template];
		expect(t.label).toBe('My ritual');
		expect(t.userNamed).toBe(true);
	});

	it('"Create new template" reveals the column editor', async () => {
		const user = userEvent.setup();
		render(TemplatePickerModal, {
			open: true,
			onSelect: vi.fn(),
			onClose: vi.fn()
		});
		await user.click(screen.getByRole('button', { name: /create new template/i }));
		expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/column 1 title/i)).toBeInTheDocument();
	});

	it('saving from the editor calls onSelect with the derived template', async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(TemplatePickerModal, {
			open: true,
			onSelect,
			onClose: vi.fn()
		});
		await user.click(screen.getByRole('button', { name: /create new template/i }));
		await user.type(screen.getByLabelText(/column 1 title/i), 'Alpha');
		await user.click(screen.getByRole('button', { name: /add column/i }));
		await user.type(screen.getByLabelText(/column 2 title/i), 'Beta');
		await user.click(screen.getByRole('button', { name: /save template/i }));

		expect(onSelect).toHaveBeenCalledTimes(1);
		const [t] = onSelect.mock.calls[0] as [Template];
		expect(t.columns.map((c) => c.title)).toEqual(['Alpha', 'Beta']);
		expect(t.key).toBe(templateKeyFromTitles(['Alpha', 'Beta']));
		expect(t.userNamed).toBe(false);
	});
});

function escapeRegex(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}
