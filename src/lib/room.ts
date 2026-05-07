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

	const columns = doc.getArray<Column>('columns');

	doc.transact(() => {
		meta.set('name', params.name);
		meta.set('templateId', params.templateId);
		columns.push(template.columns.map((c) => ({ id: c.id, title: c.title })));
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
	return doc.getArray<Column>('columns').toArray();
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
	const arr = doc.getArray<Column>('columns');
	return readable<Column[]>(arr.toArray(), (set) => {
		const handler = () => set(arr.toArray());
		arr.observe(handler);
		return () => arr.unobserve(handler);
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
