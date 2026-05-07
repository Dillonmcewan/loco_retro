import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { generateRoomId, isRoomId, seedRoom, readRoomMeta, readColumns } from './room';
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates';

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

describe('seedRoom', () => {
	it('writes meta and columns from the chosen template into an empty doc', () => {
		const doc = new Y.Doc();
		const seeded = seedRoom(doc, { name: 'Sprint 42', templateId: DEFAULT_TEMPLATE_ID });

		expect(seeded).toBe(true);
		expect(readRoomMeta(doc)).toEqual({
			name: 'Sprint 42',
			templateId: DEFAULT_TEMPLATE_ID
		});
		expect(readColumns(doc)).toEqual(getTemplate(DEFAULT_TEMPLATE_ID)?.columns);
	});

	it('is a no-op on an already-seeded doc', () => {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'Sprint 42', templateId: DEFAULT_TEMPLATE_ID });
		const seeded = seedRoom(doc, { name: 'Different name', templateId: 'start-stop-continue' });

		expect(seeded).toBe(false);
		expect(readRoomMeta(doc)).toEqual({
			name: 'Sprint 42',
			templateId: DEFAULT_TEMPLATE_ID
		});
		expect(readColumns(doc)).toEqual(getTemplate(DEFAULT_TEMPLATE_ID)?.columns);
	});

	it('throws on an unknown template id', () => {
		const doc = new Y.Doc();
		expect(() => seedRoom(doc, { name: 'x', templateId: 'nope' })).toThrow(/Unknown template/);
	});

	it('seeds columns as Y.Map entries with a nested empty cards Y.Array', () => {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'Sprint 42', templateId: DEFAULT_TEMPLATE_ID });

		const arr = doc.getArray<Y.Map<unknown>>('columns');
		expect(arr.length).toBeGreaterThan(0);
		for (const col of arr) {
			expect(col).toBeInstanceOf(Y.Map);
			expect(typeof col.get('id')).toBe('string');
			expect(typeof col.get('title')).toBe('string');
			const cards = col.get('cards');
			expect(cards).toBeInstanceOf(Y.Array);
			expect((cards as Y.Array<unknown>).length).toBe(0);
		}
	});
});

describe('readRoomMeta', () => {
	it('returns null when the doc is empty', () => {
		const doc = new Y.Doc();
		expect(readRoomMeta(doc)).toBeNull();
	});
});
