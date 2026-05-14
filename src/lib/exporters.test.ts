import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
	buildSnapshot,
	buildCsv,
	buildMarkdown,
	slugifyRoomName,
	exportFilename,
	type ExportSnapshot
} from './exporters';
import {
	addCard,
	advancePhase,
	castVote,
	editCard,
	readColumns,
	seedRoom,
	setPhase,
	toggleDiscussed
} from './room';
import { DEFAULT_TEMPLATE } from './templates';

const DEFAULT_COLS = DEFAULT_TEMPLATE.columns.map((c) => ({ title: c.title }));

function seededDoc(name = 'Sprint 42'): Y.Doc {
	const doc = new Y.Doc();
	seedRoom(doc, { name, columns: DEFAULT_COLS });
	return doc;
}

describe('buildSnapshot', () => {
	it('captures room metadata and empty columns', () => {
		const doc = seededDoc();
		const snap = buildSnapshot(doc, 1_700_000_000_000);
		expect(snap.roomName).toBe('Sprint 42');
		expect(snap.phase).toBe('collect');
		expect(snap.columns.length).toBe(DEFAULT_COLS.length);
		expect(snap.columns.every((c) => c.cards.length === 0)).toBe(true);
		expect(snap.templateLabel).toBe(DEFAULT_TEMPLATE.label);
	});

	it('sorts cards within a column by votes desc, then createdAt asc', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		const a = addCard(doc, { columnId: colId, text: 'A', author: 'Alice', authorId: 'a1' });
		const b = addCard(doc, { columnId: colId, text: 'B', author: 'Bob', authorId: 'b1' });
		const c = addCard(doc, { columnId: colId, text: 'C', author: 'Cat', authorId: 'c1' });
		setPhase(doc, 'vote');
		// votes: A=0, B=2, C=1 — order should be B, C, A
		castVote(doc, 'voter', b!.id);
		castVote(doc, 'voter', b!.id);
		castVote(doc, 'voter', c!.id);
		const snap = buildSnapshot(doc);
		const col = snap.columns[0];
		expect(col.cards.map((x) => x.text)).toEqual(['B', 'C', 'A']);
		expect(col.cards[0].votes).toBe(2);
		void a;
	});
});

describe('buildCsv', () => {
	it('emits header row and a row per card', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'Hello', author: 'Alice', authorId: 'a1' });
		const snap = buildSnapshot(doc);
		const csv = buildCsv(snap);
		const lines = csv.trim().split('\n');
		expect(lines[0]).toBe('Column,Card,Author,Votes,Discussed,Created At,Edited At');
		expect(lines[1]).toMatch(/^Went well,Hello,Alice,0,,/);
	});

	it('emits header-only when no cards', () => {
		const doc = seededDoc();
		const csv = buildCsv(buildSnapshot(doc));
		expect(csv.trim().split('\n').length).toBe(1);
	});

	it('RFC 4180 quotes fields with commas, quotes, or newlines', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, {
			columnId: colId,
			text: 'has, comma and "quote"\nand newline',
			author: 'A',
			authorId: 'a'
		});
		const csv = buildCsv(buildSnapshot(doc));
		expect(csv).toContain('"has, comma and ""quote""\nand newline"');
	});

	it('marks discussed cards with "yes"', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		const card = addCard(doc, { columnId: colId, text: 'X', author: 'A', authorId: 'a' })!;
		setPhase(doc, 'discuss');
		toggleDiscussed(doc, colId, card.id);
		const csv = buildCsv(buildSnapshot(doc));
		expect(csv).toMatch(/,X,A,0,yes,/);
	});

	it('captures closed-phase rooms (phase is metadata, rows unaffected)', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'final', author: 'A', authorId: 'a' });
		advancePhase(doc);
		advancePhase(doc);
		advancePhase(doc);
		const snap = buildSnapshot(doc);
		expect(snap.phase).toBe('closed');
		const csv = buildCsv(snap);
		expect(csv).toContain('final');
	});

	it('populates the Edited At column with an ISO timestamp when a card has been edited', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		const card = addCard(doc, { columnId: colId, text: 'first', author: 'A', authorId: 'a' })!;
		editCard(doc, colId, card.id, 'second');
		const csv = buildCsv(buildSnapshot(doc));
		const dataRow = csv.trim().split('\n')[1];
		const cols = dataRow.split(',');
		expect(cols.length).toBe(7);
		expect(cols[6]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('chrisMode does not change the row shape', () => {
		const doc = new Y.Doc();
		seedRoom(doc, { name: 'Free', columns: DEFAULT_COLS, chrisMode: true });
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'X', author: 'A', authorId: 'a' });
		const csv = buildCsv(buildSnapshot(doc));
		expect(csv.split('\n').length).toBe(3); // header + 1 row + trailing newline
	});
});

describe('buildMarkdown', () => {
	it('renders H1, metadata block, and column H3s', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'Hello', author: 'Alice', authorId: 'a' });
		const md = buildMarkdown(buildSnapshot(doc, 1_700_000_000_000), 'https://x/r/abc');
		expect(md).toMatch(/^# Sprint 42/);
		expect(md).toContain('- **Template:**');
		expect(md).toContain('- **Phase:** collect');
		expect(md).toContain('- **Room:** https://x/r/abc');
		expect(md).toContain('### Went well');
		expect(md).toContain('- Hello — _Alice_');
	});

	it('omits vote line when 0 votes and discussed mark when not discussed', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'Quiet', author: 'A', authorId: 'a' });
		const md = buildMarkdown(buildSnapshot(doc));
		expect(md).toContain('- Quiet — _A_\n');
		expect(md).not.toContain('votes');
		expect(md).not.toContain('discussed');
	});

	it('emits "(no cards)" for empty columns', () => {
		const md = buildMarkdown(buildSnapshot(seededDoc()));
		expect(md).toContain('_(no cards)_');
	});

	it('renders the closed phase in the metadata block', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		addCard(doc, { columnId: colId, text: 'final', author: 'A', authorId: 'a' });
		advancePhase(doc);
		advancePhase(doc);
		advancePhase(doc);
		const md = buildMarkdown(buildSnapshot(doc));
		expect(md).toContain('- **Phase:** closed');
		expect(md).toContain('- final — _A_');
	});

	it('singularizes "vote" when count is 1', () => {
		const doc = seededDoc();
		const colId = readColumns(doc)[0].id;
		const card = addCard(doc, { columnId: colId, text: 'X', author: 'A', authorId: 'a' })!;
		setPhase(doc, 'vote');
		castVote(doc, 'voter', card.id);
		const md = buildMarkdown(buildSnapshot(doc));
		expect(md).toContain('· 1 vote');
		expect(md).not.toContain('· 1 votes');
	});
});

describe('slugifyRoomName', () => {
	it('lowercases and collapses non-alphanumerics', () => {
		expect(slugifyRoomName('Sprint 42 Retro!')).toBe('sprint-42-retro');
	});

	it('falls back to "retro" for blank/empty input', () => {
		expect(slugifyRoomName('   ')).toBe('retro');
		expect(slugifyRoomName('')).toBe('retro');
	});

	it('strips non-ASCII alphanumerics (documented behavior)', () => {
		// `é` and `☕` are not [a-z0-9], so they collapse to separators.
		expect(slugifyRoomName('Café ☕')).toBe('caf');
	});
});

describe('exportFilename', () => {
	it('joins slug, ISO date, and extension', () => {
		const d = new Date('2026-05-14T10:00:00Z');
		expect(exportFilename('Sprint 42', 'csv', d)).toMatch(/^sprint-42-2026-05-1[34]\.csv$/);
		expect(exportFilename('Sprint 42', 'md', d)).toMatch(/^sprint-42-2026-05-1[34]\.md$/);
	});
});

// Compile-time check: type is exported.
const _typecheck: ExportSnapshot | undefined = undefined;
void _typecheck;
