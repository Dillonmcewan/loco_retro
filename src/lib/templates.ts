import { hashString } from './hash';
import type { RoomIndexEntry } from './rooms';

export type TemplateColumn = {
	title: string;
};

export type Template = {
	key: string;
	label: string;
	columns: TemplateColumn[];
};

function normalizeTitles(titles: readonly string[]): string[] {
	return titles.map((t) => t.trim().toLowerCase().replace(/\s+/g, ' '));
}

export function templateKeyFromTitles(titles: readonly string[]): string {
	const joined = normalizeTitles(titles).join('');
	return hashString(joined).toString(36);
}

const MAX_LABEL_LEN = 48;

export function deriveTemplateLabel(titles: readonly string[]): string {
	const joined = titles.map((t) => t.trim()).join(' / ');
	if (joined.length <= MAX_LABEL_LEN) return joined;
	return joined.slice(0, MAX_LABEL_LEN - 1).trimEnd() + '…';
}

function buildPreset(label: string, titles: string[]): Template {
	return {
		key: templateKeyFromTitles(titles),
		label,
		columns: titles.map((title) => ({ title }))
	};
}

export const PRESET_TEMPLATES: readonly Template[] = [
	buildPreset("Went well / Didn't go well / Actions", ['Went well', "Didn't go well", 'Actions']),
	buildPreset('Start / Stop / Continue', ['Start', 'Stop', 'Continue']),
	buildPreset('Mad / Sad / Glad', ['Mad', 'Sad', 'Glad']),
	buildPreset('4Ls', ['Liked', 'Learned', 'Lacked', 'Longed for'])
] as const;

export const DEFAULT_TEMPLATE: Template = PRESET_TEMPLATES[0];

const PRESET_KEYS = new Set(PRESET_TEMPLATES.map((t) => t.key));

function templateFromEntry(entry: RoomIndexEntry): Template | null {
	if (!entry.columnTitles || entry.columnTitles.length === 0) return null;
	const key = templateKeyFromTitles(entry.columnTitles);
	return {
		key,
		label: entry.templateName?.trim() || deriveTemplateLabel(entry.columnTitles),
		columns: entry.columnTitles.map((title) => ({ title }))
	};
}

function uniqueHistoryTemplates(rooms: readonly RoomIndexEntry[]): Template[] {
	// Rooms come in lastOpenedAt-desc order (listRooms guarantees this).
	const seen = new Set<string>();
	const out: Template[] = [];
	for (const r of rooms) {
		const t = templateFromEntry(r);
		if (!t) continue;
		if (seen.has(t.key)) continue;
		seen.add(t.key);
		out.push(t);
	}
	return out;
}

export function recentTemplates(rooms: readonly RoomIndexEntry[], limit = 3): Template[] {
	const history = uniqueHistoryTemplates(rooms);
	const seen = new Set(history.map((t) => t.key));
	const out: Template[] = history.slice(0, limit);
	for (const preset of PRESET_TEMPLATES) {
		if (out.length >= limit) break;
		if (seen.has(preset.key)) continue;
		out.push(preset);
		seen.add(preset.key);
	}
	return out.slice(0, limit);
}

export function aggregatedTemplates(rooms: readonly RoomIndexEntry[]): {
	yours: Template[];
	presets: Template[];
} {
	const yours = uniqueHistoryTemplates(rooms).filter((t) => !PRESET_KEYS.has(t.key));
	return { yours, presets: [...PRESET_TEMPLATES] };
}
