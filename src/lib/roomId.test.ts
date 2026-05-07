import { describe, it, expect } from 'vitest';
import { generateRoomId, isRoomId } from './roomId';

describe('generateRoomId', () => {
	it('returns a valid UUID v4', () => {
		const id = generateRoomId();
		expect(isRoomId(id)).toBe(true);
	});

	it('produces distinct ids', () => {
		const ids = new Set(Array.from({ length: 100 }, generateRoomId));
		expect(ids.size).toBe(100);
	});
});

describe('isRoomId', () => {
	it('accepts a generated id', () => {
		expect(isRoomId(generateRoomId())).toBe(true);
	});

	it('rejects malformed strings', () => {
		expect(isRoomId('not-a-uuid')).toBe(false);
		expect(isRoomId('')).toBe(false);
		expect(isRoomId('00000000-0000-0000-0000-000000000000')).toBe(false); // not v4
		expect(isRoomId('zzzzzzzz-zzzz-4zzz-8zzz-zzzzzzzzzzzz')).toBe(false);
	});

	it('rejects non-strings', () => {
		expect(isRoomId(undefined)).toBe(false);
		expect(isRoomId(null)).toBe(false);
		expect(isRoomId(42)).toBe(false);
		expect(isRoomId({})).toBe(false);
	});
});
