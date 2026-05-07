import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { seedRoom, readRoomMeta, readColumns } from './seed';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '../templates';

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
});

describe('readRoomMeta', () => {
	it('returns null when the doc is empty', () => {
		const doc = new Y.Doc();
		expect(readRoomMeta(doc)).toBeNull();
	});
});
