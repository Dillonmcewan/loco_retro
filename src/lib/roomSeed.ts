import type * as Y from 'yjs';
import { getTemplate, type Column } from './templates';

export type SeedParams = {
	name: string;
	templateId: string;
};

export type RoomMetaSnapshot = {
	name: string;
	templateId: string;
};

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
