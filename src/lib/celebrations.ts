// Registry of closing-phase celebration variants. Each retro is mapped to
// one variant deterministically by room id (mirrors emptyPlaceholders.ts) so
// the same room always lands on the same show, while different rooms spread
// across the registry.
//
// Adding a new variant is two steps:
//   1. Drop a new <Name>Show.svelte component into ./celebrations/ with
//      class="celebration-variant" on its root div.
//   2. Add an entry below — { id, Show, reducedText }.
// The CelebrationId type, the URL override (?celebration=<id>), the
// per-room deterministic picker, and the reduced-motion fallback all pick
// the new variant up automatically.

import type { Component } from 'svelte';
import RocketShow from './celebrations/RocketShow.svelte';
import DiscoShow from './celebrations/DiscoShow.svelte';
import { hashString } from './hash';

export type Celebration = {
	id: string;
	Show: Component;
	// Shown by the reduced-motion fallback in place of the animated banner.
	// Should mirror the wording on the variant's own banner so the message
	// stays consistent.
	reducedText: string;
};

export const CELEBRATIONS = [
	{ id: 'rocket', Show: RocketShow, reducedText: 'Mission Accomplished!' },
	{ id: 'disco', Show: DiscoShow, reducedText: 'Party Time!' }
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
