import { describe, it, expect } from 'vitest';
import { colorsByParticipant } from './participantColor';

describe('colorsByParticipant', () => {
	it('assigns the first palette color to the lowest clientId', () => {
		const map = colorsByParticipant([{ clientId: 50 }, { clientId: 10 }, { clientId: 30 }]);
		// Sorted ascending: 10, 30, 50 — so 10 gets the first palette entry.
		const ten = map.get(10)!;
		const thirty = map.get(30)!;
		const fifty = map.get(50)!;
		expect(ten).toBeDefined();
		expect(thirty).toBeDefined();
		expect(fifty).toBeDefined();
		expect(ten).not.toEqual(thirty);
		expect(thirty).not.toEqual(fifty);
		expect(ten).not.toEqual(fifty);
	});

	it('does not collide for any participant set within palette size', () => {
		const people = Array.from({ length: 10 }, (_, i) => ({ clientId: i }));
		const map = colorsByParticipant(people);
		const distinctBgs = new Set(Array.from(map.values()).map((c) => c.bg));
		expect(distinctBgs.size).toBe(10);
	});

	it('wraps around past the palette size', () => {
		const people = Array.from({ length: 12 }, (_, i) => ({ clientId: i }));
		const map = colorsByParticipant(people);
		// 11th and 12th wrap to the first two palette entries.
		expect(map.get(0)).toEqual(map.get(10));
		expect(map.get(1)).toEqual(map.get(11));
	});

	it('is deterministic for the same input set', () => {
		const a = colorsByParticipant([{ clientId: 7 }, { clientId: 3 }]);
		const b = colorsByParticipant([{ clientId: 3 }, { clientId: 7 }]);
		expect(a.get(3)).toEqual(b.get(3));
		expect(a.get(7)).toEqual(b.get(7));
	});

	it('returns an empty map for no participants', () => {
		expect(colorsByParticipant([])).toEqual(new Map());
	});

	it('returns palette-shape entries (hex bg/fg)', () => {
		const map = colorsByParticipant([{ clientId: 1 }]);
		const c = map.get(1)!;
		expect(c.bg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(c.fg).toMatch(/^#[0-9a-f]{6}$/i);
	});
});
