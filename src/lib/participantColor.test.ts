import { describe, it, expect } from 'vitest';
import { colorForName } from './participantColor';

describe('colorForName', () => {
	it('returns the same color for the same name across calls', () => {
		const a = colorForName('Dillon');
		const b = colorForName('Dillon');
		expect(a).toEqual(b);
	});

	it('returns case- and whitespace-sensitive results', () => {
		// Documents current behavior: hashing is exact-string. If we ever want
		// to fold case/whitespace, this assertion will need to flip.
		expect(colorForName('Dillon')).not.toEqual(colorForName('dillon'));
		expect(colorForName('Dillon')).not.toEqual(colorForName(' Dillon'));
	});

	it('returns one of the palette entries (matching bg/fg shape)', () => {
		const c = colorForName('Anyone');
		expect(typeof c.bg).toBe('string');
		expect(typeof c.fg).toBe('string');
		expect(c.bg).toMatch(/^#[0-9a-f]{6}$/i);
		expect(c.fg).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('distributes across multiple palette entries for varied inputs', () => {
		const names = ['Alice', 'Bob', 'Charlie', 'Dillon', 'Eve', 'Frank', 'Grace', 'Heidi'];
		const distinct = new Set(names.map((n) => colorForName(n).bg));
		// Not asserting all-distinct (collisions are allowed), but the hash
		// should produce more than one bucket for a small varied sample.
		expect(distinct.size).toBeGreaterThan(1);
	});

	it('handles the empty string without throwing', () => {
		expect(() => colorForName('')).not.toThrow();
		const c = colorForName('');
		expect(c.bg).toMatch(/^#[0-9a-f]{6}$/i);
	});
});
