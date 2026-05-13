import { PHASE_ORDER, type Phase } from './room';

const ROOMS_KEY = 'loco_retro:rooms';

export type RoomIndexEntry = {
	id: string;
	name: string;
	columnTitles: string[];
	templateName?: string;
	lastOpenedAt: number;
	phase?: Phase;
};

function storage(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

function isEntry(value: unknown): value is RoomIndexEntry {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	if (
		typeof v.id !== 'string' ||
		v.id.length === 0 ||
		typeof v.name !== 'string' ||
		typeof v.lastOpenedAt !== 'number' ||
		!Number.isFinite(v.lastOpenedAt)
	) {
		return false;
	}
	if (
		!Array.isArray(v.columnTitles) ||
		v.columnTitles.length === 0 ||
		v.columnTitles.some((t) => typeof t !== 'string' || t.trim() === '')
	) {
		return false;
	}
	if (v.templateName !== undefined && typeof v.templateName !== 'string') {
		return false;
	}
	if (v.phase !== undefined && !(PHASE_ORDER as readonly string[]).includes(v.phase as string)) {
		return false;
	}
	return true;
}

function readAll(): RoomIndexEntry[] {
	const s = storage();
	if (!s) return [];
	const raw = s.getItem(ROOMS_KEY);
	if (!raw) return [];
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isEntry);
	} catch {
		return [];
	}
}

function writeAll(entries: RoomIndexEntry[]): void {
	const s = storage();
	if (!s) return;
	s.setItem(ROOMS_KEY, JSON.stringify(entries));
}

export function listRooms(): RoomIndexEntry[] {
	return readAll().sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export function getRoom(id: string): RoomIndexEntry | null {
	return readAll().find((e) => e.id === id) ?? null;
}

export function upsertRoom(entry: RoomIndexEntry): void {
	const all = readAll();
	const idx = all.findIndex((e) => e.id === entry.id);
	if (idx === -1) {
		all.push(entry);
	} else {
		all[idx] = entry;
	}
	writeAll(all);
}

export function touchRoom(id: string): void {
	const all = readAll();
	const idx = all.findIndex((e) => e.id === id);
	if (idx === -1) return;
	all[idx] = { ...all[idx], lastOpenedAt: Date.now() };
	writeAll(all);
}

export function removeRoom(id: string): void {
	const all = readAll();
	const next = all.filter((e) => e.id !== id);
	if (next.length !== all.length) writeAll(next);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const THIRTY_DAYS = 30 * DAY;

export function formatRelative(ms: number, now: number = Date.now()): string {
	const diff = now - ms;
	if (diff < 0) return 'just now';
	if (diff < MINUTE) return 'just now';
	if (diff < HOUR) {
		const m = Math.floor(diff / MINUTE);
		return `${m}m ago`;
	}
	if (diff < DAY) {
		const h = Math.floor(diff / HOUR);
		return `${h}h ago`;
	}
	if (diff < THIRTY_DAYS) {
		const d = Math.floor(diff / DAY);
		return `${d}d ago`;
	}
	return new Date(ms).toLocaleDateString();
}
