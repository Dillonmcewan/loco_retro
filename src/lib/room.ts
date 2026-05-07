import { readable, type Readable } from 'svelte/store';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import { getTemplate, type Column } from './templates';

// ─── Config ────────────────────────────────────────────────────────────────

const RELAY_URL =
	(typeof import.meta !== 'undefined' && import.meta.env?.VITE_RELAY_URL) ?? 'ws://localhost:1234';

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

export type RoomMetaSnapshot = {
	name: string;
	templateId: string;
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
		columns.push(
			template.columns.map((c) => {
				const col = new Y.Map<unknown>();
				col.set('id', c.id);
				col.set('title', c.title);
				col.set('cards', new Y.Array<Y.Map<unknown>>());
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
	return { name, templateId };
}

export function readColumns(doc: Y.Doc): Column[] {
	return doc.getArray<Y.Map<unknown>>('columns').toArray().map(columnFromMap);
}

function columnFromMap(m: Y.Map<unknown>): Column {
	return { id: m.get('id') as string, title: m.get('title') as string };
}

function findColumn(doc: Y.Doc, columnId: string): Y.Map<unknown> | null {
	const cols = doc.getArray<Y.Map<unknown>>('columns');
	for (const col of cols) {
		if (col.get('id') === columnId) return col;
	}
	return null;
}

function cardsArray(col: Y.Map<unknown>): Y.Array<Y.Map<unknown>> {
	return col.get('cards') as Y.Array<Y.Map<unknown>>;
}

function cardFromMap(m: Y.Map<unknown>): Card {
	const editedAt = m.get('editedAt');
	const card: Card = {
		id: m.get('id') as string,
		text: m.get('text') as string,
		author: m.get('author') as string,
		authorId: m.get('authorId') as string,
		createdAt: m.get('createdAt') as number
	};
	if (typeof editedAt === 'number') card.editedAt = editedAt;
	return card;
}

export function addCard(doc: Y.Doc, params: AddCardParams): Card | null {
	const col = findColumn(doc, params.columnId);
	if (!col) return null;
	const card: Card = {
		id: crypto.randomUUID(),
		text: params.text,
		author: params.author,
		authorId: params.authorId,
		createdAt: Date.now()
	};
	doc.transact(() => {
		const m = new Y.Map<unknown>();
		m.set('id', card.id);
		m.set('text', card.text);
		m.set('author', card.author);
		m.set('authorId', card.authorId);
		m.set('createdAt', card.createdAt);
		cardsArray(col).push([m]);
	});
	return card;
}

export function editCard(doc: Y.Doc, columnId: string, cardId: string, text: string): boolean {
	const col = findColumn(doc, columnId);
	if (!col) return false;
	const cards = cardsArray(col);
	for (const card of cards) {
		if (card.get('id') === cardId) {
			doc.transact(() => {
				card.set('text', text);
				card.set('editedAt', Date.now());
			});
			return true;
		}
	}
	return false;
}

export function deleteCard(doc: Y.Doc, columnId: string, cardId: string): boolean {
	const col = findColumn(doc, columnId);
	if (!col) return false;
	const cards = cardsArray(col);
	for (let i = 0; i < cards.length; i++) {
		if (cards.get(i).get('id') === cardId) {
			doc.transact(() => cards.delete(i, 1));
			return true;
		}
	}
	return false;
}

export function readCards(doc: Y.Doc): CardsByColumn {
	const out: CardsByColumn = {};
	for (const col of doc.getArray<Y.Map<unknown>>('columns')) {
		const id = col.get('id') as string;
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

export function getActiveRoom(): OpenRoom | null {
	return active?.room ?? null;
}

// ─── Svelte stores ─────────────────────────────────────────────────────────

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
