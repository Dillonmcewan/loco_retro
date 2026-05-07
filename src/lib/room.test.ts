import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import * as Y from 'yjs';
import {
	generateRoomId,
	isRoomId,
	seedRoom,
	readRoomMeta,
	readColumns,
	readCards,
	addCard,
	editCard,
	deleteCard,
	cardsStore
} from './room';
import { getTemplate, DEFAULT_TEMPLATE_ID } from './templates';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function seededDoc(): Y.Doc {
	const doc = new Y.Doc();
	seedRoom(doc, { name: 'Sprint 42', templateId: DEFAULT_TEMPLATE_ID });
	return doc;
}

function firstColumnId(doc: Y.Doc): string {
	return readColumns(doc)[0].id;
}

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

describe('addCard', () => {
	it('appends a card with the expected shape and a UUID id', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, {
			columnId: colId,
			text: 'hello',
			author: 'Dillon',
			authorId: 'author-1'
		});

		expect(card).not.toBeNull();
		expect(card!.id).toMatch(UUID_V4);
		expect(card!.text).toBe('hello');
		expect(card!.author).toBe('Dillon');
		expect(card!.authorId).toBe('author-1');
		expect(typeof card!.createdAt).toBe('number');

		const cards = readCards(doc)[colId];
		expect(cards).toHaveLength(1);
		expect(cards[0]).toEqual(card);
	});

	it('returns null and is a no-op for an unknown column id', () => {
		const doc = seededDoc();
		const result = addCard(doc, {
			columnId: 'no-such-column',
			text: 'x',
			author: 'Dillon',
			authorId: 'a'
		});
		expect(result).toBeNull();
	});

	it('keeps cards isolated to their own column', () => {
		const doc = seededDoc();
		const cols = readColumns(doc);
		addCard(doc, { columnId: cols[0].id, text: 'A', author: 'D', authorId: 'a' });
		addCard(doc, { columnId: cols[1].id, text: 'B', author: 'D', authorId: 'a' });

		const cards = readCards(doc);
		expect(cards[cols[0].id].map((c) => c.text)).toEqual(['A']);
		expect(cards[cols[1].id].map((c) => c.text)).toEqual(['B']);
	});
});

describe('editCard', () => {
	it('updates text and stamps editedAt', async () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, { columnId: colId, text: 'old', author: 'D', authorId: 'a' })!;

		// Tiny gap so editedAt is observably different from createdAt.
		await new Promise((r) => setTimeout(r, 1));
		expect(editCard(doc, colId, card.id, 'new')).toBe(true);

		const updated = readCards(doc)[colId][0];
		expect(updated.text).toBe('new');
		expect(updated.editedAt).toBeTypeOf('number');
		expect(updated.editedAt!).toBeGreaterThanOrEqual(updated.createdAt);
	});

	it('returns false for an unknown card id', () => {
		const doc = seededDoc();
		expect(editCard(doc, firstColumnId(doc), 'nope', 'x')).toBe(false);
	});
});

describe('deleteCard', () => {
	it('removes only the targeted card', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const a = addCard(doc, { columnId: colId, text: 'A', author: 'D', authorId: 'a' })!;
		const b = addCard(doc, { columnId: colId, text: 'B', author: 'D', authorId: 'a' })!;

		expect(deleteCard(doc, colId, a.id)).toBe(true);

		const remaining = readCards(doc)[colId];
		expect(remaining).toHaveLength(1);
		expect(remaining[0].id).toBe(b.id);
	});

	it('returns false for an unknown card id', () => {
		const doc = seededDoc();
		expect(deleteCard(doc, firstColumnId(doc), 'nope')).toBe(false);
	});
});

describe('cardsStore', () => {
	it('snapshots existing seeded state and re-fires on mutations', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const store = cardsStore(doc);

		const seen: Array<Record<string, number>> = [];
		const unsub = store.subscribe((v) => {
			const counts: Record<string, number> = {};
			for (const k of Object.keys(v)) counts[k] = v[k].length;
			seen.push(counts);
		});

		const card = addCard(doc, { columnId: colId, text: 'hi', author: 'D', authorId: 'a' })!;
		editCard(doc, colId, card.id, 'hi!');
		deleteCard(doc, colId, card.id);

		unsub();

		// Initial snapshot, then add, edit, delete — at least 4 emissions.
		expect(seen.length).toBeGreaterThanOrEqual(4);
		expect(seen[0][colId]).toBe(0);
		expect(seen[seen.length - 1][colId]).toBe(0);

		// Final read also shows the column emptied.
		const final = get(store);
		expect(final[colId]).toEqual([]);
	});

	it('reflects remote mutations applied via Y.applyUpdate', () => {
		const docA = seededDoc();
		const docB = new Y.Doc();
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		const colId = firstColumnId(docA);
		const store = cardsStore(docB);

		addCard(docA, { columnId: colId, text: 'remote', author: 'A', authorId: 'aa' });
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		const snap = get(store);
		expect(snap[colId]).toHaveLength(1);
		expect(snap[colId][0].text).toBe('remote');
		expect(snap[colId][0].author).toBe('A');
	});
});
