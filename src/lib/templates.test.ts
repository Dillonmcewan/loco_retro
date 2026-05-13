import { describe, it, expect } from 'vitest';
import {
	PRESET_TEMPLATES,
	DEFAULT_TEMPLATE,
	templateKeyFromTitles,
	deriveTemplateLabel,
	recentTemplates,
	aggregatedTemplates,
	type Template
} from './templates';
import type { RoomIndexEntry } from './rooms';

describe('PRESET_TEMPLATES', () => {
	it('ships the four expected presets', () => {
		expect(PRESET_TEMPLATES.map((t) => t.label)).toEqual([
			"Went well / Didn't go well / Actions",
			'Start / Stop / Continue',
			'Mad / Sad / Glad',
			'4Ls'
		]);
	});

	it('each preset has at least one column and non-empty titles', () => {
		for (const template of PRESET_TEMPLATES) {
			expect(template.columns.length).toBeGreaterThan(0);
			for (const column of template.columns) {
				expect(column.title.trim()).not.toBe('');
				expect(column).not.toHaveProperty('id');
			}
		}
	});

	it('preset keys are unique and match key-from-titles', () => {
		const keys = PRESET_TEMPLATES.map((t) => t.key);
		expect(new Set(keys).size).toBe(keys.length);
		for (const t of PRESET_TEMPLATES) {
			expect(t.key).toBe(templateKeyFromTitles(t.columns.map((c) => c.title)));
		}
	});
});

describe('templateKeyFromTitles', () => {
	it('is order-sensitive', () => {
		expect(templateKeyFromTitles(['A', 'B'])).not.toBe(templateKeyFromTitles(['B', 'A']));
	});

	it('is case-insensitive and whitespace-tolerant', () => {
		expect(templateKeyFromTitles(['Start', 'Stop'])).toBe(
			templateKeyFromTitles(['  start ', 'STOP'])
		);
	});

	it('returns the same key for the same titles in the same order', () => {
		expect(templateKeyFromTitles(['x', 'y', 'z'])).toBe(templateKeyFromTitles(['x', 'y', 'z']));
	});
});

describe('deriveTemplateLabel', () => {
	it('joins titles with " / "', () => {
		expect(deriveTemplateLabel(['Mad', 'Sad', 'Glad'])).toBe('Mad / Sad / Glad');
	});

	it('truncates past ~48 chars with an ellipsis', () => {
		const titles = ['Aaaaaaaaaaaaa', 'Bbbbbbbbbbbbb', 'Cccccccccccccc', 'Dddddddddddd'];
		const out = deriveTemplateLabel(titles);
		expect(out.length).toBeLessThanOrEqual(48);
		expect(out.endsWith('…')).toBe(true);
	});
});

function entry(overrides: Partial<RoomIndexEntry> & { columnTitles: string[] }): RoomIndexEntry {
	return {
		id: overrides.id ?? crypto.randomUUID(),
		name: overrides.name ?? 'room',
		columnTitles: overrides.columnTitles,
		templateName: overrides.templateName,
		lastOpenedAt: overrides.lastOpenedAt ?? Date.now(),
		phase: overrides.phase
	};
}

describe('recentTemplates', () => {
	it('with empty history, returns the first N presets', () => {
		const out = recentTemplates([], 3);
		expect(out.length).toBe(3);
		expect(out.map((t) => t.label)).toEqual(PRESET_TEMPLATES.slice(0, 3).map((t) => t.label));
	});

	it('returns most-recent unique templates first then pads with presets', () => {
		const rooms: RoomIndexEntry[] = [
			entry({ columnTitles: ['Mind', 'Body', 'Soul'], lastOpenedAt: 30 }),
			entry({ columnTitles: ['Mind', 'Body', 'Soul'], lastOpenedAt: 20 }), // dupe
			entry({ columnTitles: ['Foo', 'Bar'], lastOpenedAt: 10 })
		];
		const out = recentTemplates(rooms, 3);
		expect(out.length).toBe(3);
		expect(out[0].columns.map((c) => c.title)).toEqual(['Mind', 'Body', 'Soul']);
		expect(out[1].columns.map((c) => c.title)).toEqual(['Foo', 'Bar']);
		expect(out[2].key).toBe(PRESET_TEMPLATES[0].key);
	});

	it('does not duplicate when history contains a preset', () => {
		const preset = PRESET_TEMPLATES[1];
		const rooms: RoomIndexEntry[] = [
			entry({ columnTitles: preset.columns.map((c) => c.title), lastOpenedAt: 30 })
		];
		const out = recentTemplates(rooms, 3);
		const keys = out.map((t) => t.key);
		expect(new Set(keys).size).toBe(keys.length);
		expect(keys).toContain(preset.key);
	});
});

describe('aggregatedTemplates', () => {
	it('partitions yours and presets', () => {
		const rooms: RoomIndexEntry[] = [
			entry({ columnTitles: ['Mind', 'Body', 'Soul'], lastOpenedAt: 10 })
		];
		const { yours, presets } = aggregatedTemplates(rooms);
		expect(yours.map((t: Template) => t.columns.map((c) => c.title))).toEqual([
			['Mind', 'Body', 'Soul']
		]);
		expect(presets.map((t) => t.label)).toEqual(PRESET_TEMPLATES.map((t) => t.label));
	});

	it('keeps a user template matching a preset out of Yours', () => {
		const preset = PRESET_TEMPLATES[0];
		const rooms: RoomIndexEntry[] = [
			entry({ columnTitles: preset.columns.map((c) => c.title), lastOpenedAt: 10 })
		];
		const { yours, presets } = aggregatedTemplates(rooms);
		expect(yours).toEqual([]);
		expect(presets.some((p) => p.key === preset.key)).toBe(true);
	});
});

describe('DEFAULT_TEMPLATE', () => {
	it('is one of the presets', () => {
		expect(PRESET_TEMPLATES.some((t) => t.key === DEFAULT_TEMPLATE.key)).toBe(true);
	});
});
