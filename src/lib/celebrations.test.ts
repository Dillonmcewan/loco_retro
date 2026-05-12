import { describe, it, expect } from 'vitest';
import { celebrationFor, celebrationById, CELEBRATIONS } from './celebrations';

describe('celebrationFor', () => {
	it('returns the same celebration for the same roomId on repeated calls', () => {
		const a = celebrationFor('room-abc');
		const b = celebrationFor('room-abc');
		expect(a).toEqual(b);
	});

	it('returns a celebration from the published registry', () => {
		const pick = celebrationFor('any-room');
		expect(CELEBRATIONS).toContain(pick);
	});

	it('spreads across the full registry over many room ids', () => {
		const seeds = Array.from({ length: 200 }, (_, i) => `room-${i}-${i * 31}`);
		const ids = new Set(seeds.map((s) => celebrationFor(s).id));
		// With only two variants today, every variant should appear at least
		// once. As we add variants, all of them should still appear over a
		// 200-sample sweep.
		expect(ids.size).toBe(CELEBRATIONS.length);
	});
});

describe('celebrationById', () => {
	it('returns the matching celebration for a known id', () => {
		expect(celebrationById('rocket')).toBe(CELEBRATIONS.find((c) => c.id === 'rocket'));
		expect(celebrationById('disco')).toBe(CELEBRATIONS.find((c) => c.id === 'disco'));
	});

	it('returns undefined for unknown, null, or empty input', () => {
		expect(celebrationById('nope')).toBeUndefined();
		expect(celebrationById(null)).toBeUndefined();
		expect(celebrationById(undefined)).toBeUndefined();
		expect(celebrationById('')).toBeUndefined();
	});
});
