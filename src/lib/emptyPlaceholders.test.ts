import { describe, it, expect } from 'vitest';
import { placeholderFor, PLACEHOLDERS } from './emptyPlaceholders';

describe('placeholderFor', () => {
	it('returns the same placeholder for the same (roomId, columnIndex) on repeated calls', () => {
		const a = placeholderFor('room-abc', 0);
		const b = placeholderFor('room-abc', 0);
		expect(a).toBe(b);
	});

	it('assigns distinct placeholders to every column of a 4-column template', () => {
		const picks = [0, 1, 2, 3].map((i) => placeholderFor('room-4ls', i));
		expect(new Set(picks).size).toBe(4);
	});

	it('produces different placeholders for different room ids most of the time', () => {
		const seeds = Array.from({ length: 50 }, (_, i) => `room-${i}-${i * 31}`);
		const reference = placeholderFor('reference-room', 0);
		const differingCount = seeds.filter((s) => placeholderFor(s, 0) !== reference).length;
		// Pool size is 12, so on average ~91% should differ. Use a loose floor.
		expect(differingCount).toBeGreaterThanOrEqual(40);
	});

	it('only returns entries from the published pool', () => {
		const pick = placeholderFor('any-room', 0);
		expect(PLACEHOLDERS).toContain(pick);
	});
});
