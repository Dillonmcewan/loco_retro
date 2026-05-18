// One snapshot, many formats. `buildSnapshot` is the SOLE walker of the
// Y.Doc; every format-specific builder (`buildCsv`, `buildMarkdown`, the print
// route) must be a pure function over `ExportSnapshot`. Do not add a second
// walker — a new format keeps exports consistent only if it derives from the
// same snapshot.
import type * as Y from 'yjs';
import {
	readCards,
	readColumns,
	readRoomMeta,
	readVoteTotals,
	type Card,
	type Phase
} from './room';
import { deriveTemplateLabel } from './templates';

export type ExportFormat = 'pdf' | 'csv' | 'md';

export type ExportCard = Card & { votes: number };

export type ExportColumn = {
	id: string;
	title: string;
	cards: ExportCard[];
};

export type ExportSnapshot = {
	roomName: string;
	templateLabel: string;
	phase: Phase;
	columns: ExportColumn[];
	exportedAt: number;
};

// `votes desc, then createdAt asc` matches the Discuss view ordering.
function compareCards(a: ExportCard, b: ExportCard): number {
	if (b.votes !== a.votes) return b.votes - a.votes;
	return a.createdAt - b.createdAt;
}

export function buildSnapshot(doc: Y.Doc, now: number = Date.now()): ExportSnapshot {
	const meta = readRoomMeta(doc);
	const columnsRaw = readColumns(doc);
	const cardsByColumn = readCards(doc);
	const totals = readVoteTotals(doc);

	const columns: ExportColumn[] = columnsRaw.map((col) => {
		const cards = (cardsByColumn[col.id] ?? []).map(
			(c): ExportCard => ({ ...c, votes: totals[c.id] ?? 0 })
		);
		cards.sort(compareCards);
		return { id: col.id, title: col.title, cards };
	});

	return {
		roomName: meta?.name ?? '',
		templateLabel: deriveTemplateLabel(columnsRaw.map((c) => c.title)),
		phase: meta?.phase ?? 'collect',
		columns,
		exportedAt: now
	};
}

// ─── CSV ───────────────────────────────────────────────────────────────────

const CSV_HEADERS = ['Column', 'Card', 'Author', 'Votes', 'Discussed'];

function csvEscape(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function csvRow(values: readonly string[]): string {
	return values.map(csvEscape).join(',');
}

export function buildCsv(snapshot: ExportSnapshot): string {
	const lines: string[] = [csvRow(CSV_HEADERS)];
	for (const col of snapshot.columns) {
		for (const card of col.cards) {
			lines.push(
				csvRow([
					col.title,
					card.text,
					card.author,
					String(card.votes),
					card.discussed ? 'yes' : ''
				])
			);
		}
	}
	return lines.join('\n') + '\n';
}

// ─── Markdown ──────────────────────────────────────────────────────────────

function formatCardLine(card: ExportCard): string {
	const bits: string[] = [`- ${card.text} — _${card.author}_`];
	if (card.votes > 0) bits.push(`${card.votes} ${card.votes === 1 ? 'vote' : 'votes'}`);
	if (card.discussed) bits.push('✓ discussed');
	return bits.join(' · ');
}

export function buildMarkdown(snapshot: ExportSnapshot, roomUrl?: string): string {
	const lines: string[] = [];
	lines.push(`# ${snapshot.roomName || 'Retro'}`);
	lines.push('');
	lines.push(`- **Template:** ${snapshot.templateLabel}`);
	lines.push(`- **Phase:** ${snapshot.phase}`);
	lines.push(`- **Exported:** ${new Date(snapshot.exportedAt).toISOString()}`);
	if (roomUrl) lines.push(`- **Room:** ${roomUrl}`);
	lines.push('');

	for (const col of snapshot.columns) {
		lines.push(`### ${col.title}`);
		lines.push('');
		if (col.cards.length === 0) {
			lines.push('_(no cards)_');
		} else {
			for (const card of col.cards) {
				lines.push(formatCardLine(card));
			}
		}
		lines.push('');
	}

	return lines.join('\n');
}

// ─── Filename ──────────────────────────────────────────────────────────────

export function slugifyRoomName(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	return slug || 'retro';
}

function ymd(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function exportFilename(
	roomName: string,
	ext: 'csv' | 'md',
	now: Date = new Date()
): string {
	return `${slugifyRoomName(roomName)}-${ymd(now)}.${ext}`;
}

// ─── Download ──────────────────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	// Defer revoke so Safari/Firefox have a tick to start the download.
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
