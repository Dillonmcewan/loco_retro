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
	cardsStore,
	roomMetaStore,
	getPhase,
	setPhase,
	advancePhase,
	stepBackPhase,
	castVote,
	retractVote,
	readMyBallot,
	readVoteTotals,
	myBallotStore,
	voteTotalsStore,
	type Phase,
	type Ballot,
	type VoteTotals
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
			templateId: DEFAULT_TEMPLATE_ID,
			phase: 'collect',
			votesPerParticipant: 5
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
			templateId: DEFAULT_TEMPLATE_ID,
			phase: 'collect',
			votesPerParticipant: 5
		});
		expect(readColumns(doc)).toEqual(getTemplate(DEFAULT_TEMPLATE_ID)?.columns);
	});

	it('honors an explicit votesPerParticipant value', () => {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID, votesPerParticipant: 12 });
		expect(readRoomMeta(doc)?.votesPerParticipant).toBe(12);
	});

	it('rejects non-positive / non-integer votesPerParticipant', () => {
		const doc = new Y.Doc();
		expect(() =>
			seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID, votesPerParticipant: 0 })
		).toThrow(/votesPerParticipant/);
		expect(() =>
			seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID, votesPerParticipant: -1 })
		).toThrow(/votesPerParticipant/);
		expect(() =>
			seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID, votesPerParticipant: 1.5 })
		).toThrow(/votesPerParticipant/);
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

	it('rejects empty / whitespace-only text', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		expect(addCard(doc, { columnId: colId, text: '', author: 'D', authorId: 'a' })).toBeNull();
		expect(addCard(doc, { columnId: colId, text: '   ', author: 'D', authorId: 'a' })).toBeNull();
		expect(addCard(doc, { columnId: colId, text: '\n\t ', author: 'D', authorId: 'a' })).toBeNull();
		expect(readCards(doc)[colId]).toEqual([]);
	});

	it('trims surrounding whitespace from text', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, {
			columnId: colId,
			text: '  hello  ',
			author: 'D',
			authorId: 'a'
		})!;
		expect(card.text).toBe('hello');
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

	it('rejects empty / whitespace-only text', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, { columnId: colId, text: 'old', author: 'D', authorId: 'a' })!;
		expect(editCard(doc, colId, card.id, '')).toBe(false);
		expect(editCard(doc, colId, card.id, '   ')).toBe(false);
		expect(readCards(doc)[colId][0].text).toBe('old');
	});

	it('is a no-op write when the new (trimmed) text matches the current text', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, { columnId: colId, text: 'same', author: 'D', authorId: 'a' })!;
		expect(editCard(doc, colId, card.id, '  same  ')).toBe(true);
		// editedAt stays absent because no transact ran.
		expect(readCards(doc)[colId][0].editedAt).toBeUndefined();
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

describe('mutation gating by phase', () => {
	it('addCard returns null and is a no-op outside collect', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		advancePhase(doc); // → vote
		const result = addCard(doc, { columnId: colId, text: 'x', author: 'D', authorId: 'a' });
		expect(result).toBeNull();
		expect(readCards(doc)[colId]).toEqual([]);
	});

	it('editCard returns false and is a no-op outside collect', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, { columnId: colId, text: 'old', author: 'D', authorId: 'a' })!;
		advancePhase(doc); // → vote
		expect(editCard(doc, colId, card.id, 'new')).toBe(false);
		expect(readCards(doc)[colId][0].text).toBe('old');
	});

	it('deleteCard returns false and is a no-op outside collect', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		const card = addCard(doc, { columnId: colId, text: 'A', author: 'D', authorId: 'a' })!;
		advancePhase(doc); // → vote
		expect(deleteCard(doc, colId, card.id)).toBe(false);
		expect(readCards(doc)[colId]).toHaveLength(1);
	});

	it('returning to collect re-enables mutations', () => {
		const doc = seededDoc();
		const colId = firstColumnId(doc);
		advancePhase(doc);
		stepBackPhase(doc);
		const card = addCard(doc, { columnId: colId, text: 'x', author: 'D', authorId: 'a' });
		expect(card).not.toBeNull();
	});
});

describe('phase machine', () => {
	it('seeded doc starts in collect', () => {
		const doc = seededDoc();
		expect(getPhase(doc)).toBe('collect');
	});

	it('advancePhase walks Collect → Vote → Discuss → Closed and stops', () => {
		const doc = seededDoc();
		expect(advancePhase(doc)).toBe('vote');
		expect(advancePhase(doc)).toBe('discuss');
		expect(advancePhase(doc)).toBe('closed');
		expect(advancePhase(doc)).toBe('closed');
		expect(getPhase(doc)).toBe('closed');
	});

	it('stepBackPhase is a no-op at collect and walks back otherwise', () => {
		const doc = seededDoc();
		expect(stepBackPhase(doc)).toBe('collect');
		advancePhase(doc);
		advancePhase(doc);
		expect(getPhase(doc)).toBe('discuss');
		expect(stepBackPhase(doc)).toBe('vote');
		expect(stepBackPhase(doc)).toBe('collect');
		expect(stepBackPhase(doc)).toBe('collect');
	});

	it('setPhase rejects unknown values', () => {
		const doc = seededDoc();
		expect(() => setPhase(doc, 'bogus' as unknown as Phase)).toThrow(/Unknown phase/);
		expect(getPhase(doc)).toBe('collect');
	});

	it('phase change syncs across docs and into roomMetaStore', () => {
		const docA = seededDoc();
		const docB = new Y.Doc();
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		const store = roomMetaStore(docB);
		const seen: Array<Phase | undefined> = [];
		const unsub = store.subscribe((v) => seen.push(v?.phase));

		advancePhase(docA);
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		unsub();
		expect(getPhase(docB)).toBe('vote');
		expect(seen[seen.length - 1]).toBe('vote');
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

describe('ballots: seed + helpers', () => {
	function seededVotingDoc(votesPerParticipant = 5): { doc: Y.Doc; colId: string } {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID, votesPerParticipant });
		const colId = readColumns(doc)[0].id;
		return { doc, colId };
	}

	function addAndVote(doc: Y.Doc, colId: string): string {
		const card = addCard(doc, { columnId: colId, text: 'card', author: 'A', authorId: 'a' })!;
		return card.id;
	}

	it('seedRoom initializes an empty ballots map; idempotent on re-seed', () => {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID });
		expect(readVoteTotals(doc)).toEqual({});
		expect(readMyBallot(doc, 'a')).toEqual({});
		// Second seed is no-op (already asserted above), ballots stay empty.
		seedRoom(doc, { name: 'r2', templateId: DEFAULT_TEMPLATE_ID });
		expect(readVoteTotals(doc)).toEqual({});
	});

	it('castVote outside vote phase is a no-op', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		// still in collect
		expect(castVote(doc, 'a', cid)).toBe(false);
		expect(readMyBallot(doc, 'a')).toEqual({});
		// advance to vote → works
		advancePhase(doc);
		expect(castVote(doc, 'a', cid)).toBe(true);
		// advance again to discuss → no-op
		advancePhase(doc);
		expect(castVote(doc, 'a', cid)).toBe(false);
	});

	it('castVote increments and stacks', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		expect(castVote(doc, 'a', cid)).toBe(true);
		expect(readMyBallot(doc, 'a')[cid]).toBe(1);
		expect(castVote(doc, 'a', cid)).toBe(true);
		expect(readMyBallot(doc, 'a')[cid]).toBe(2);
	});

	it('castVote refuses once budget is spent', () => {
		const { doc, colId } = seededVotingDoc(3);
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		expect(castVote(doc, 'a', cid)).toBe(true);
		expect(castVote(doc, 'a', cid)).toBe(true);
		expect(castVote(doc, 'a', cid)).toBe(true);
		expect(castVote(doc, 'a', cid)).toBe(false);
		expect(readVoteTotals(doc)[cid]).toBe(3);
	});

	it('retractVote decrements; clamps at 0; drops key at 0', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		castVote(doc, 'a', cid);
		castVote(doc, 'a', cid);
		expect(retractVote(doc, 'a', cid)).toBe(true);
		expect(readMyBallot(doc, 'a')[cid]).toBe(1);
		expect(retractVote(doc, 'a', cid)).toBe(true);
		expect(readMyBallot(doc, 'a')[cid]).toBeUndefined();
		expect(retractVote(doc, 'a', cid)).toBe(false);
	});

	it('retractVote outside vote phase is a no-op', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		castVote(doc, 'a', cid);
		advancePhase(doc); // → discuss
		expect(retractVote(doc, 'a', cid)).toBe(false);
		expect(readMyBallot(doc, 'a')[cid]).toBe(1);
	});

it('readVoteTotals sums across authors, omits zero', () => {
		const { doc, colId } = seededVotingDoc();
		const card1 = addCard(doc, { columnId: colId, text: '1', author: 'A', authorId: 'a' })!;
		const card2 = addCard(doc, { columnId: colId, text: '2', author: 'A', authorId: 'a' })!;
		advancePhase(doc);
		castVote(doc, 'a', card1.id);
		castVote(doc, 'a', card1.id);
		castVote(doc, 'b', card1.id);
		castVote(doc, 'b', card2.id);
		expect(readVoteTotals(doc)).toEqual({ [card1.id]: 3, [card2.id]: 1 });
	});

	it('readMyBallot scopes to the requested author', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		castVote(doc, 'a', cid);
		castVote(doc, 'b', cid);
		castVote(doc, 'b', cid);
		expect(readMyBallot(doc, 'a')).toEqual({ [cid]: 1 });
		expect(readMyBallot(doc, 'b')).toEqual({ [cid]: 2 });
	});

	it('stepping back vote → collect leaves ballots untouched', () => {
		const { doc, colId } = seededVotingDoc();
		const cid = addAndVote(doc, colId);
		advancePhase(doc);
		castVote(doc, 'a', cid);
		castVote(doc, 'a', cid);
		stepBackPhase(doc);
		expect(readMyBallot(doc, 'a')[cid]).toBe(2);
		expect(readVoteTotals(doc)[cid]).toBe(2);
	});

	it('deleteCard refunds votes across all authors', () => {
		const { doc, colId } = seededVotingDoc(5);
		const card = addCard(doc, { columnId: colId, text: '1', author: 'A', authorId: 'a' })!;
		const other = addCard(doc, { columnId: colId, text: '2', author: 'A', authorId: 'a' })!;
		advancePhase(doc);
		castVote(doc, 'a', card.id);
		castVote(doc, 'a', card.id);
		castVote(doc, 'b', card.id);
		castVote(doc, 'b', other.id);
		stepBackPhase(doc); // back to collect to delete
		expect(deleteCard(doc, colId, card.id)).toBe(true);
		expect(readVoteTotals(doc)).toEqual({ [other.id]: 1 });
		expect(readMyBallot(doc, 'a')).toEqual({});
		expect(readMyBallot(doc, 'b')).toEqual({ [other.id]: 1 });
	});

	it('deleteCard on a card with zero votes leaves ballots untouched', () => {
		const { doc, colId } = seededVotingDoc();
		const card = addCard(doc, { columnId: colId, text: '1', author: 'A', authorId: 'a' })!;
		const other = addCard(doc, { columnId: colId, text: '2', author: 'A', authorId: 'a' })!;
		advancePhase(doc);
		castVote(doc, 'a', other.id);
		stepBackPhase(doc);
		expect(deleteCard(doc, colId, card.id)).toBe(true);
		expect(readVoteTotals(doc)).toEqual({ [other.id]: 1 });
	});
});

describe('vote stores', () => {
	function seededVotingDoc(): { doc: Y.Doc; cardId: string } {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'r', templateId: DEFAULT_TEMPLATE_ID });
		const colId = readColumns(doc)[0].id;
		const card = addCard(doc, { columnId: colId, text: '1', author: 'A', authorId: 'a' })!;
		advancePhase(doc);
		return { doc, cardId: card.id };
	}

	it('myBallotStore emits on local writes', () => {
		const { doc, cardId } = seededVotingDoc();
		const store = myBallotStore(doc, 'a');
		const seen: Ballot[] = [];
		const unsub = store.subscribe((v) => seen.push(v));
		castVote(doc, 'a', cardId);
		castVote(doc, 'a', cardId);
		retractVote(doc, 'a', cardId);
		unsub();
		expect(seen[0]).toEqual({});
		expect(seen[seen.length - 1]).toEqual({ [cardId]: 1 });
		expect(get(store)).toEqual({ [cardId]: 1 });
	});

	it("myBallotStore ignores remote authors' writes by value", () => {
		const { doc, cardId } = seededVotingDoc();
		const store = myBallotStore(doc, 'a');
		const seen: Ballot[] = [];
		const unsub = store.subscribe((v) => seen.push(v));
		castVote(doc, 'b', cardId);
		castVote(doc, 'b', cardId);
		unsub();
		// All emissions should be {} since only 'b' wrote.
		for (const s of seen) expect(s).toEqual({});
	});

	it('voteTotalsStore emits on remote-author updates via Y.applyUpdate', () => {
		const docA = new Y.Doc();
		seedRoom(docA, { name: 'r', templateId: DEFAULT_TEMPLATE_ID });
		const colId = readColumns(docA)[0].id;
		const card = addCard(docA, { columnId: colId, text: '1', author: 'A', authorId: 'a' })!;
		advancePhase(docA);

		const docB = new Y.Doc();
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		const store = voteTotalsStore(docB);
		const seen: VoteTotals[] = [];
		const unsub = store.subscribe((v) => seen.push(v));

		castVote(docA, 'remote', card.id);
		Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA));

		unsub();
		expect(seen[seen.length - 1]).toEqual({ [card.id]: 1 });
	});
});
