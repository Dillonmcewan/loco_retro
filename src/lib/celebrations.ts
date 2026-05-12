// Registry of closing-phase celebration variants. Each retro is mapped to
// one variant deterministically by room id (mirrors emptyPlaceholders.ts) so
// the same room always lands on the same show, while different rooms spread
// across the registry.
//
// Adding a new variant is two steps:
//   1. Drop a new <Name>Show.svelte component into ./celebrations/
//   2. Add an entry below — { id: 'name', Show: NameShow }
// The CelebrationId type and the URL override (?celebration=<id>) pick it
// up automatically.

import type { Component } from 'svelte';
import RocketShow from './celebrations/RocketShow.svelte';
import DiscoShow from './celebrations/DiscoShow.svelte';
import { hashString } from './hash';

export type Celebration = {
	id: string;
	Show: Component;
};

export const CELEBRATIONS = [
	{ id: 'rocket', Show: RocketShow },
	{ id: 'disco', Show: DiscoShow }
] as const satisfies readonly Celebration[];

export type CelebrationId = (typeof CELEBRATIONS)[number]['id'];

// Deterministic per roomId. Different rooms hash to different indices; the
// same room always returns the same celebration on every close.
export function celebrationFor(roomId: string): Celebration {
	const seed = hashString(roomId);
	return CELEBRATIONS[seed % CELEBRATIONS.length];
}

// Lookup by id — used by the URL override `?celebration=<id>` for deliberate
// testing of a specific variant.
export function celebrationById(id: string | null | undefined): Celebration | undefined {
	if (!id) return undefined;
	return CELEBRATIONS.find((c) => c.id === id);
}
