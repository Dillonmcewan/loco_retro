const KEY = 'loco_retro:displayName';

function storage(): Storage | null {
	return typeof localStorage === 'undefined' ? null : localStorage;
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
