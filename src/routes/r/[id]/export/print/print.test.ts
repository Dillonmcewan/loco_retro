import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import * as Y from 'yjs';

const { roomHolder } = vi.hoisted(() => ({
	roomHolder: { room: null as unknown }
}));

vi.mock('$lib/room', async () => {
	const actual = await vi.importActual<typeof import('$lib/room')>('$lib/room');
	return {
		...actual,
		ensureRoom: vi.fn(() => roomHolder.room),
		leaveRoom: vi.fn()
	};
});

import PrintPage from './+page.svelte';
import { addCard, leaveRoom, seedRoom, type OpenRoom } from '$lib/room';

const VALID_ID = '11111111-1111-4111-8111-111111111111';

function buildRoom(
	whenSynced: Promise<void> = Promise.resolve()
): Y.Doc {
	const doc = new Y.Doc();
	seedRoom(doc, {
		name: 'Sprint 42',
		columns: [{ title: 'Went well' }, { title: "Didn't go well" }, { title: 'Actions' }]
	});
	const colId = (doc.getArray<Y.Map<unknown>>('columns').get(0) as Y.Map<unknown>).get(
		'id'
	) as string;
	addCard(doc, { columnId: colId, text: 'shipped the thing', author: 'Alice', authorId: 'a' });
	roomHolder.room = {
		doc,
		awareness: {} as OpenRoom['awareness'],
		provider: {} as OpenRoom['provider'],
		persistence: { whenSynced } as unknown as OpenRoom['persistence'],
		destroy: vi.fn()
	};
	return doc;
}

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
	let resolve!: (v: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

describe('Export print page', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		buildRoom();
		// Stub print so the auto-print on mount is observable + harmless.
		Object.defineProperty(window, 'print', { configurable: true, value: vi.fn() });
	});

	it('renders the room name, columns, and cards from the local doc', async () => {
		render(PrintPage, { props: { data: { id: VALID_ID } } });
		await waitFor(() =>
			expect(screen.getByRole('heading', { level: 1, name: /sprint 42/i })).toBeInTheDocument()
		);
		expect(screen.getByRole('heading', { name: /^went well$/i })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: /didn't go well/i })).toBeInTheDocument();
		expect(screen.getByText(/shipped the thing/)).toBeInTheDocument();
	});

	it('calls window.print after the snapshot resolves', async () => {
		render(PrintPage, { props: { data: { id: VALID_ID } } });
		await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
	});

	it('holds the loading state until whenSynced resolves, then auto-prints', async () => {
		const d = deferred<void>();
		buildRoom(d.promise);
		render(PrintPage, { props: { data: { id: VALID_ID } } });

		await waitFor(() => expect(screen.getByText(/loading retro/i)).toBeInTheDocument());
		expect(window.print).not.toHaveBeenCalled();

		d.resolve();
		await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
		expect(screen.queryByText(/loading retro/i)).not.toBeInTheDocument();
	});

	it('calls leaveRoom when unmounted before whenSynced resolves', async () => {
		const d = deferred<void>();
		buildRoom(d.promise);
		const { unmount } = render(PrintPage, { props: { data: { id: VALID_ID } } });

		await waitFor(() => expect(screen.getByText(/loading retro/i)).toBeInTheDocument());
		expect(leaveRoom).not.toHaveBeenCalled();

		unmount();
		expect(leaveRoom).toHaveBeenCalled();
	});
});
