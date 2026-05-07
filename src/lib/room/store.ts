import { readable, type Readable } from 'svelte/store';
import type * as Y from 'yjs';
import { openRoomDoc, type OpenRoom } from './doc';
import { readRoomMeta, type RoomMetaSnapshot } from './seed';
import type { Column } from '../templates';
import type { RoomId } from './id';

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

export type Participant = { clientId: number; name: string };

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
