import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import type { RoomId } from './roomId';

const RELAY_URL =
	(typeof import.meta !== 'undefined' && import.meta.env?.VITE_RELAY_URL) ?? 'ws://localhost:1234';

export type OpenRoom = {
	doc: Y.Doc;
	awareness: WebsocketProvider['awareness'];
	provider: WebsocketProvider;
	persistence: IndexeddbPersistence;
	destroy: () => void;
};

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
