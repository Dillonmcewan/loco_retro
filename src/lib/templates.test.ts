import { describe, it, expect } from 'vitest';
import { PRESET_TEMPLATES, DEFAULT_TEMPLATE_ID, getTemplate } from './templates';

describe('PRESET_TEMPLATES', () => {
	it('ships the four expected presets', () => {
		expect(PRESET_TEMPLATES.map((t) => t.id)).toEqual([
			'wwd-actions',
			'start-stop-continue',
			'mad-sad-glad',
			'4ls'
		]);
	});

	it('each preset has at least one column and unique column ids', () => {
		for (const template of PRESET_TEMPLATES) {
			expect(template.columns.length).toBeGreaterThan(0);
			const ids = template.columns.map((c) => c.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it('each preset has a non-empty label and column titles', () => {
		for (const template of PRESET_TEMPLATES) {
			expect(template.label.trim()).not.toBe('');
			for (const column of template.columns) {
				expect(column.title.trim()).not.toBe('');
			}
		}
	});

	it('preset ids are unique', () => {
		const ids = PRESET_TEMPLATES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('getTemplate', () => {
	it('returns the preset for a known id', () => {
		const t = getTemplate(DEFAULT_TEMPLATE_ID);
		expect(t).toBeDefined();
		expect(t?.id).toBe(DEFAULT_TEMPLATE_ID);
	});

	it('returns undefined for an unknown id', () => {
		expect(getTemplate('does-not-exist')).toBeUndefined();
	});
});

describe('DEFAULT_TEMPLATE_ID', () => {
	it('matches an existing preset', () => {
		expect(PRESET_TEMPLATES.some((t) => t.id === DEFAULT_TEMPLATE_ID)).toBe(true);
	});
});
