/**
 * Per-participant pill colors. Sorts participants by clientId ascending and
 * assigns palette colors by position, so two participants in the same room
 * never share a color until the room exceeds PALETTE.length. Two browsers
 * may render the same name with different colors — that's fine since the
 * mapping is local-only.
 *
 * Trade-off: a participant's color can shift if an earlier-clientId
 * participant disconnects and the room re-sorts. Acceptable for v1.
 */

export type ParticipantColor = { bg: string; fg: string };

const PALETTE: ReadonlyArray<ParticipantColor> = [
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

/**
 * Build a clientId → color lookup for the given participant set. Sort by
 * clientId ascending; collisions only happen past PALETTE.length, where we
 * wrap.
 */
export function colorsByParticipant<T extends { clientId: number }>(
	people: ReadonlyArray<T>
): Map<number, ParticipantColor> {
	const sorted = [...people].sort((a, b) => a.clientId - b.clientId);
	const map = new Map<number, ParticipantColor>();
	sorted.forEach((p, i) => map.set(p.clientId, PALETTE[i % PALETTE.length]));
	return map;
}
