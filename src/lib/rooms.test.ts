import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	listRooms,
	getRoom,
	upsertRoom,
	touchRoom,
	removeRoom,
	formatRelative,
	type RoomIndexEntry
} from './rooms';

const ROOMS_KEY = 'loco_retro:rooms';

function entry(overrides: Partial<RoomIndexEntry> = {}): RoomIndexEntry {
	return {
		id: 'a',
		name: 'A retro',
		columnTitles: ['Went well', "Didn't go well", 'Actions'],
		lastOpenedAt: 1_000,
		...overrides
	};
}

describe('rooms sidecar index', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('listRooms returns [] when nothing is stored', () => {
		expect(listRooms()).toEqual([]);
	});

	it('upsertRoom inserts a fresh entry', () => {
		upsertRoom(entry());
		const rooms = listRooms();
		expect(rooms).toHaveLength(1);
		expect(rooms[0].id).toBe('a');
		expect(rooms[0].columnTitles).toEqual(['Went well', "Didn't go well", 'Actions']);
	});

	it('round-trips optional templateName', () => {
		upsertRoom(entry({ templateName: 'My favourite' }));
		expect(listRooms()[0].templateName).toBe('My favourite');
	});

	it('upsertRoom updates an existing entry in place (no duplicates)', () => {
		upsertRoom(entry({ id: 'a', name: 'first', lastOpenedAt: 1 }));
		upsertRoom(entry({ id: 'a', name: 'second', lastOpenedAt: 2 }));
		const rooms = listRooms();
		expect(rooms).toHaveLength(1);
		expect(rooms[0].name).toBe('second');
		expect(rooms[0].lastOpenedAt).toBe(2);
	});

	it('listRooms sorts by lastOpenedAt descending', () => {
		upsertRoom(entry({ id: 'old', lastOpenedAt: 1 }));
		upsertRoom(entry({ id: 'new', lastOpenedAt: 3 }));
		upsertRoom(entry({ id: 'mid', lastOpenedAt: 2 }));
		expect(listRooms().map((r) => r.id)).toEqual(['new', 'mid', 'old']);
	});

	it('getRoom returns the entry by id, or null', () => {
		upsertRoom(entry({ id: 'a' }));
		expect(getRoom('a')?.id).toBe('a');
		expect(getRoom('missing')).toBeNull();
	});

	it('touchRoom refreshes lastOpenedAt for an existing entry', () => {
		upsertRoom(entry({ id: 'a', lastOpenedAt: 1 }));
		const before = Date.now();
		touchRoom('a');
		const after = Date.now();
		const refreshed = listRooms()[0];
		expect(refreshed.lastOpenedAt).toBeGreaterThanOrEqual(before);
		expect(refreshed.lastOpenedAt).toBeLessThanOrEqual(after);
	});

	it('touchRoom is a no-op when the id is missing', () => {
		upsertRoom(entry({ id: 'a', lastOpenedAt: 1 }));
		touchRoom('missing');
		expect(listRooms()[0].lastOpenedAt).toBe(1);
	});

	it('removeRoom deletes the matching entry', () => {
		upsertRoom(entry({ id: 'a' }));
		upsertRoom(entry({ id: 'b' }));
		removeRoom('a');
		expect(listRooms().map((r) => r.id)).toEqual(['b']);
	});

	it('removeRoom is a no-op when the id is missing', () => {
		upsertRoom(entry({ id: 'a' }));
		removeRoom('missing');
		expect(listRooms()).toHaveLength(1);
	});

	it('tolerates malformed JSON in storage by returning []', () => {
		localStorage.setItem(ROOMS_KEY, '{not valid json');
		expect(listRooms()).toEqual([]);
	});

	it('tolerates non-array JSON in storage by returning []', () => {
		localStorage.setItem(ROOMS_KEY, '"a string"');
		expect(listRooms()).toEqual([]);
	});

	it('filters out malformed entries when reading', () => {
		const mixed = JSON.stringify([
			entry({ id: 'good' }),
			{ id: 'missing-fields' },
			{ id: 5, name: 'wrong-type', columnTitles: ['x'], lastOpenedAt: 1 },
			{ id: 'no-titles', name: 'x', lastOpenedAt: 1 },
			{ id: 'empty-titles', name: 'x', columnTitles: [], lastOpenedAt: 1 },
			{ id: 'blank-title', name: 'x', columnTitles: ['  '], lastOpenedAt: 1 },
			{
				id: 'bad-name',
				name: 'x',
				columnTitles: ['ok'],
				lastOpenedAt: 1,
				templateName: 5
			}
		]);
		localStorage.setItem(ROOMS_KEY, mixed);
		expect(listRooms().map((r) => r.id)).toEqual(['good']);
	});
});

describe('rooms sidecar index without localStorage (SSR-like)', () => {
	const original = globalThis.localStorage;

	beforeEach(() => {
		vi.stubGlobal('localStorage', undefined);
	});

	afterEach(() => {
		vi.stubGlobal('localStorage', original);
	});

	it('listRooms returns [] instead of throwing', () => {
		expect(() => listRooms()).not.toThrow();
		expect(listRooms()).toEqual([]);
	});

	it('upsertRoom is a no-op', () => {
		expect(() => upsertRoom(entry())).not.toThrow();
	});

	it('touchRoom is a no-op', () => {
		expect(() => touchRoom('a')).not.toThrow();
	});

	it('removeRoom is a no-op', () => {
		expect(() => removeRoom('a')).not.toThrow();
	});
});

describe('formatRelative', () => {
	const now = 1_000_000_000_000;

	it('returns "just now" for sub-minute deltas', () => {
		expect(formatRelative(now, now)).toBe('just now');
		expect(formatRelative(now - 30_000, now)).toBe('just now');
	});

	it('returns "just now" for future timestamps (clock skew)', () => {
		expect(formatRelative(now + 5_000, now)).toBe('just now');
	});

	it('renders minutes for < 1h', () => {
		expect(formatRelative(now - 5 * 60_000, now)).toBe('5m ago');
		expect(formatRelative(now - 59 * 60_000, now)).toBe('59m ago');
	});

	it('renders hours for < 1d', () => {
		expect(formatRelative(now - 2 * 3_600_000, now)).toBe('2h ago');
		expect(formatRelative(now - 23 * 3_600_000, now)).toBe('23h ago');
	});

	it('renders days for < 30d', () => {
		expect(formatRelative(now - 2 * 86_400_000, now)).toBe('2d ago');
		expect(formatRelative(now - 29 * 86_400_000, now)).toBe('29d ago');
	});

	it('falls back to a locale date past 30d', () => {
		const out = formatRelative(now - 60 * 86_400_000, now);
		expect(out).not.toMatch(/ago$/);
		expect(out.length).toBeGreaterThan(0);
	});
});
