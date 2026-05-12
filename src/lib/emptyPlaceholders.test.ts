import { describe, it, expect } from 'vitest';
import { placeholderFor, PLACEHOLDERS } from './emptyPlaceholders';

describe('placeholderFor', () => {
	it('returns the same icon/text/color for the same (roomId, columnIndex) on repeated calls', () => {
		const a = placeholderFor('room-abc', 0);
		const b = placeholderFor('room-abc', 0);
		expect(a).toEqual(b);
	});

	it('assigns distinct icons to every column of a 4-column template', () => {
		const picks = [0, 1, 2, 3].map((i) => placeholderFor('room-4ls', i));
		const icons = new Set(picks.map((p) => p.Icon));
		expect(icons.size).toBe(4);
	});

	it('assigns distinct colors to adjacent columns', () => {
		const picks = [0, 1, 2, 3].map((i) => placeholderFor('room-colors', i).color);
		// With 4 colors cycled by columnIndex, all four colors should appear.
		expect(new Set(picks).size).toBe(4);
	});

	it('produces different icon/text for different room ids most of the time', () => {
		const seeds = Array.from({ length: 50 }, (_, i) => `room-${i}-${i * 31}`);
		const reference = placeholderFor('reference-room', 0);
		const differingCount = seeds.filter((s) => placeholderFor(s, 0).text !== reference.text).length;
		// Pool size is 12, so on average ~91% should differ. Use a loose floor.
		expect(differingCount).toBeGreaterThanOrEqual(40);
	});

	it('only returns entries whose icon/text appear in the published pool', () => {
		const pick = placeholderFor('any-room', 0);
		const matches = PLACEHOLDERS.some((p) => p.Icon === pick.Icon && p.text === pick.text);
		expect(matches).toBe(true);
	});
});
