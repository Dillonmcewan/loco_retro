const KEY = 'loco_retro:displayName';
const AUTHOR_ID_KEY = 'loco_retro:authorId';

function storage(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
}

/**
 * Returns a stable per-browser author id (UUID v4), generating + persisting
 * one on first call. In SSR-like environments without localStorage, returns
 * a fresh ephemeral id rather than throwing.
 */
export function getAuthorId(): string {
	const s = storage();
	if (!s) return crypto.randomUUID();
	const existing = s.getItem(AUTHOR_ID_KEY);
	if (existing && existing.trim() !== '') return existing;
	const fresh = crypto.randomUUID();
	s.setItem(AUTHOR_ID_KEY, fresh);
	return fresh;
}

export function getDisplayName(): string | null {
	const s = storage();
	if (!s) return null;
	const value = s.getItem(KEY);
	return value && value.trim() !== '' ? value : null;
}

export function setDisplayName(value: string): void {
	const s = storage();
	if (!s) return;
	s.setItem(KEY, value);
}

export function clearDisplayName(): void {
	const s = storage();
	if (!s) return;
	s.removeItem(KEY);
}
