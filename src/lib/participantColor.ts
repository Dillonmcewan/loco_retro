/**
 * Deterministic, per-name pill colors. Same display name always produces the
 * same color in this browser session, so participants stay visually stable as
 * the awareness list reorders. Two browsers may render the same name with
 * different colors — that's fine since the mapping is local-only.
 */

const PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
	{ bg: '#ffd9c2', fg: '#7a3a1d' }, // peach
	{ bg: '#ffe2b8', fg: '#7a4f1d' }, // amber
	{ bg: '#fef3b7', fg: '#6e591a' }, // butter
	{ bg: '#dcefc6', fg: '#3d6a2c' }, // sage
	{ bg: '#c8e7da', fg: '#1f5e4a' }, // mint
	{ bg: '#c5e0ee', fg: '#1d4f6e' }, // sky
	{ bg: '#d6d6f1', fg: '#3a3a85' }, // lavender
	{ bg: '#ecd1ea', fg: '#6b2a66' }, // orchid
	{ bg: '#f5cfd5', fg: '#7a2a3a' }, // rose
	{ bg: '#e6dac7', fg: '#5a4a30' } // sand
];

function hash(str: string): number {
	// FNV-1a, 32-bit. Tiny, distributes single-character changes well.
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

export function colorForName(name: string): { bg: string; fg: string } {
	// How likely are hash collisions here? I wonder if a better strategy would be to deterministically
	// sort all users in the channel and then assign colors based on that order. That would guarantee no collisions
	// until we hit PALETTE.length + 1 users. New users joining the channel might cause the assigned colors to shift
	// (unless we sort on the join time), but that is a minor issue
	const idx = hash(name) % PALETTE.length;
	return PALETTE[idx];
}
