import { readable, type Readable } from 'svelte/store';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import { getTemplate, type Column } from './templates';

// ─── Config ────────────────────────────────────────────────────────────────

// VITE_RELAY_URL is required. The committed `.env` carries the dev default
// (ws://localhost:1234); prod builds get it from the deploy target. Fail
// fast at module load rather than silently connecting to the wrong place.
const RELAY_URL = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_RELAY_URL : undefined;
if (!RELAY_URL) {
	throw new Error('VITE_RELAY_URL is not set. Add it to .env (dev) or your deploy target (prod).');
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type RoomId = string;

export type OpenRoom = {
	doc: Y.Doc;
	awareness: WebsocketProvider['awareness'];
	provider: WebsocketProvider;
	persistence: IndexeddbPersistence;
	destroy: () => void;
};

export type SeedParams = {
	name: string;
	templateId: string;
};

export const PHASE_ORDER = ['collect', 'vote', 'discuss', 'closed'] as const;
export type Phase = (typeof PHASE_ORDER)[number];

function isPhase(value: unknown): value is Phase {
	return typeof value === 'string' && (PHASE_ORDER as readonly string[]).includes(value);
}

export type RoomMetaSnapshot = {
	name: string;
	templateId: string;
	phase: Phase;
};

export type Participant = { clientId: number; name: string };

export type Card = {
	id: string;
	text: string;
	author: string;
	authorId: string;
	createdAt: number;
	editedAt?: number;
};

export type CardsByColumn = Record<string, Card[]>;

export type AddCardParams = {
	columnId: string;
	text: string;
	author: string;
	authorId: string;
};

// ─── Yjs typed schemas ─────────────────────────────────────────────────────
//
// Yjs's Y.Map<T> takes one uniform value type for every key — see
// yjs#490, where keyed-typing was proposed and never merged. So we
// declare each map's logical shape here and run all gets/sets through
// a tiny typed accessor that owns the casts. Read sites become
// `colAcc.get(m, 'title')` instead of `m.get('title') as string`.

type ColumnShape = {
	id: string;
	title: string;
	cards: Y.Array<Y.Map<unknown>>;
};

type CardShape = {
	id: string;
	text: string;
	author: string;
	authorId: string;
	createdAt: number;
	editedAt?: number;
};

function makeAccess<Shape>() {
	return {
		get<K extends keyof Shape>(m: Y.Map<unknown>, k: K): Shape[K] {
			return m.get(k as string) as Shape[K];
		},
		set<K extends keyof Shape>(m: Y.Map<unknown>, k: K, v: Shape[K]): void {
			m.set(k as string, v);
		}
	};
}

const colAcc = makeAccess<ColumnShape>();
const cardAcc = makeAccess<CardShape>();

// ─── Room id ───────────────────────────────────────────────────────────────

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateRoomId(): RoomId {
	return crypto.randomUUID();
}

export function isRoomId(value: unknown): value is RoomId {
	return typeof value === 'string' && UUID_V4.test(value);
}

// ─── Doc factory ───────────────────────────────────────────────────────────

/**
 * Open the Y.Doc for a room: wires up local IndexedDB persistence and a
 * y-websocket provider against the relay. Caller is responsible for invoking
 * destroy() when leaving the room (e.g. on Svelte component teardown).
 */
export function openRoomDoc(id: RoomId): OpenRoom {
	const doc = new Y.Doc();
	const persistence = new IndexeddbPersistence(`loco_retro:room:${id}`, doc);
	const provider = new WebsocketProvider(RELAY_URL, id, doc);

	return {
		doc,
		awareness: provider.awareness,
		provider,
		persistence,
		destroy: () => {
			provider.destroy();
			persistence.destroy();
			doc.destroy();
		}
	};
}

// ─── Seed + read helpers ───────────────────────────────────────────────────

/**
 * Write the room name and the chosen template's columns into the doc, but only
 * if the doc has not been seeded yet. Subsequent calls are no-ops so that
 * joiners cannot clobber the facilitator's choices.
 *
 * @returns true if seeding actually happened.
 */
export function seedRoom(doc: Y.Doc, params: SeedParams): boolean {
	const meta = doc.getMap<string>('meta');
	if (meta.get('name')) return false;

	const template = getTemplate(params.templateId);
	if (!template) {
		throw new Error(`Unknown template: ${params.templateId}`);
	}

	const columns = doc.getArray<Y.Map<unknown>>('columns');

	doc.transact(() => {
		meta.set('name', params.name);
		meta.set('templateId', params.templateId);
		meta.set('phase', 'collect');
		columns.push(
			template.columns.map((c) => {
				const col = new Y.Map<unknown>();
				colAcc.set(col, 'id', c.id);
				colAcc.set(col, 'title', c.title);
				colAcc.set(col, 'cards', new Y.Array<Y.Map<unknown>>());
				return col;
			})
		);
	});

	return true;
}

export function readRoomMeta(doc: Y.Doc): RoomMetaSnapshot | null {
	const meta = doc.getMap<string>('meta');
	const name = meta.get('name');
	const templateId = meta.get('templateId');
	if (!name || !templateId) return null;
	const rawPhase = meta.get('phase');
	const phase: Phase = isPhase(rawPhase) ? rawPhase : 'collect';
	return { name, templateId, phase };
}

// ─── Phase machine ─────────────────────────────────────────────────────────

export function getPhase(doc: Y.Doc): Phase {
	const raw = doc.getMap<string>('meta').get('phase');
	return isPhase(raw) ? raw : 'collect';
}

export function setPhase(doc: Y.Doc, phase: Phase): void {
	if (!isPhase(phase)) {
		throw new Error(`Unknown phase: ${String(phase)}`);
	}
	doc.transact(() => {
		doc.getMap<string>('meta').set('phase', phase);
	});
}

export function advancePhase(doc: Y.Doc): Phase {
	const current = getPhase(doc);
	const idx = PHASE_ORDER.indexOf(current);
	if (idx < 0 || idx >= PHASE_ORDER.length - 1) return current;
	const next = PHASE_ORDER[idx + 1];
	setPhase(doc, next);
	return next;
}

export function stepBackPhase(doc: Y.Doc): Phase {
	const current = getPhase(doc);
	const idx = PHASE_ORDER.indexOf(current);
	if (idx <= 0) return current;
	const prev = PHASE_ORDER[idx - 1];
	setPhase(doc, prev);
	return prev;
}

export function readColumns(doc: Y.Doc): Column[] {
	return doc.getArray<Y.Map<unknown>>('columns').toArray().map(columnFromMap);
}

function columnFromMap(m: Y.Map<unknown>): Column {
	return { id: colAcc.get(m, 'id'), title: colAcc.get(m, 'title') };
}

function findColumn(doc: Y.Doc, columnId: string): Y.Map<unknown> | null {
	const cols = doc.getArray<Y.Map<unknown>>('columns');
	for (const col of cols) {
		if (colAcc.get(col, 'id') === columnId) return col;
	}
	return null;
}

function cardsArray(col: Y.Map<unknown>): Y.Array<Y.Map<unknown>> {
	return colAcc.get(col, 'cards');
}

function cardFromMap(m: Y.Map<unknown>): Card {
	const card: Card = {
		id: cardAcc.get(m, 'id'),
		text: cardAcc.get(m, 'text'),
		author: cardAcc.get(m, 'author'),
		authorId: cardAcc.get(m, 'authorId'),
		createdAt: cardAcc.get(m, 'createdAt')
	};
	const editedAt = cardAcc.get(m, 'editedAt');
	if (typeof editedAt === 'number') card.editedAt = editedAt;
	return card;
}

export function addCard(doc: Y.Doc, params: AddCardParams): Card | null {
	if (getPhase(doc) !== 'collect') return null;
	const text = params.text.trim();
	if (!text) return null;
	const col = findColumn(doc, params.columnId);
	if (!col) return null;
	const card: Card = {
		id: crypto.randomUUID(),
		text,
		author: params.author,
		authorId: params.authorId,
		createdAt: Date.now()
	};
	doc.transact(() => {
		const m = new Y.Map<unknown>();
		cardAcc.set(m, 'id', card.id);
		cardAcc.set(m, 'text', card.text);
		cardAcc.set(m, 'author', card.author);
		cardAcc.set(m, 'authorId', card.authorId);
		cardAcc.set(m, 'createdAt', card.createdAt);
		cardsArray(col).push([m]);
	});
	return card;
}

export function editCard(doc: Y.Doc, columnId: string, cardId: string, text: string): boolean {
	if (getPhase(doc) !== 'collect') return false;
	const trimmed = text.trim();
	if (!trimmed) return false;
	const col = findColumn(doc, columnId);
	if (!col) return false;
	const cards = cardsArray(col);
	for (const card of cards) {
		if (cardAcc.get(card, 'id') === cardId) {
			if (cardAcc.get(card, 'text') === trimmed) return true;
			doc.transact(() => {
				cardAcc.set(card, 'text', trimmed);
				cardAcc.set(card, 'editedAt', Date.now());
			});
			return true;
		}
	}
	return false;
}

export function deleteCard(doc: Y.Doc, columnId: string, cardId: string): boolean {
	if (getPhase(doc) !== 'collect') return false;
	const col = findColumn(doc, columnId);
	if (!col) return false;
	const cards = cardsArray(col);
	for (let i = 0; i < cards.length; i++) {
		if (cardAcc.get(cards.get(i), 'id') === cardId) {
			doc.transact(() => cards.delete(i, 1));
			return true;
		}
	}
	return false;
}

export function readCards(doc: Y.Doc): CardsByColumn {
	const out: CardsByColumn = {};
	for (const col of doc.getArray<Y.Map<unknown>>('columns')) {
		const id = colAcc.get(col, 'id');
		out[id] = cardsArray(col).toArray().map(cardFromMap);
	}
	return out;
}

// ─── Active session (per tab) ──────────────────────────────────────────────

/**
 * Single active room session per tab. The create page opens it; the room page
 * picks up the same instance via `ensureRoom`. Calling `ensureRoom` with a
 * different id closes the previous session.
 */
let active: { room: OpenRoom; id: RoomId } | null = null;

export function ensureRoom(id: RoomId): OpenRoom {
	if (active && active.id === id) return active.room;
	if (active) active.room.destroy();
	const room = openRoomDoc(id);
	active = { room, id };
	return room;
}

export function leaveRoom(): void {
	if (!active) return;
	active.room.destroy();
	active = null;
}

// ─── Svelte stores ─────────────────────────────────────────────────────────

// `meta` is currently a flat string-string map; plain `observe` is enough.
// If meta ever gains nested Y types (phase state, vote config), switch this
// to `observeDeep`.
export function roomMetaStore(doc: Y.Doc): Readable<RoomMetaSnapshot | null> {
	return readable<RoomMetaSnapshot | null>(readRoomMeta(doc), (set) => {
		const meta = doc.getMap<string>('meta');
		const handler = () => set(readRoomMeta(doc));
		meta.observe(handler);
		return () => meta.unobserve(handler);
	});
}

export function columnsStore(doc: Y.Doc): Readable<Column[]> {
	const arr = doc.getArray<Y.Map<unknown>>('columns');
	const snapshot = () => arr.toArray().map(columnFromMap);
	return readable<Column[]>(snapshot(), (set) => {
		const handler = () => set(snapshot());
		arr.observe(handler);
		return () => arr.unobserve(handler);
	});
}

export function cardsStore(doc: Y.Doc): Readable<CardsByColumn> {
	const arr = doc.getArray<Y.Map<unknown>>('columns');
	return readable<CardsByColumn>(readCards(doc), (set) => {
		set(readCards(doc));
		const handler = () => set(readCards(doc));
		arr.observeDeep(handler);
		return () => arr.unobserveDeep(handler);
	});
}

export function participantsStore(awareness: OpenRoom['awareness']): Readable<Participant[]> {
	function snapshot(): Participant[] {
		const list: Participant[] = [];
		for (const [clientId, state] of awareness.getStates()) {
			const name = (state as { user?: { name?: unknown } } | undefined)?.user?.name;
			if (typeof name === 'string' && name.trim() !== '') {
				list.push({ clientId, name });
			}
		}
		return list;
	}

	return readable<Participant[]>(snapshot(), (set) => {
		const handler = () => set(snapshot());
		awareness.on('change', handler);
		return () => awareness.off('change', handler);
	});
}
