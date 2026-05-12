import Sparkles from 'lucide-svelte/icons/sparkles';
import Rocket from 'lucide-svelte/icons/rocket';
import Lightbulb from 'lucide-svelte/icons/lightbulb';
import Coffee from 'lucide-svelte/icons/coffee';
import Flame from 'lucide-svelte/icons/flame';
import Ghost from 'lucide-svelte/icons/ghost';
import Music from 'lucide-svelte/icons/music';
import Anchor from 'lucide-svelte/icons/anchor';
import Telescope from 'lucide-svelte/icons/telescope';
import Compass from 'lucide-svelte/icons/compass';
import Feather from 'lucide-svelte/icons/feather';
import Cookie from 'lucide-svelte/icons/cookie';

export type Placeholder = {
	Icon: typeof Sparkles;
	text: string;
};

export const PLACEHOLDERS: readonly Placeholder[] = [
	{ Icon: Sparkles, text: 'Toss in your first sparkle.' },
	{ Icon: Rocket, text: 'First card launches the rocket.' },
	{ Icon: Lightbulb, text: 'Spark the first idea.' },
	{ Icon: Coffee, text: 'Pour the first cup.' },
	{ Icon: Flame, text: 'Light the first match.' },
	{ Icon: Ghost, text: "It's quiet in here… too quiet." },
	{ Icon: Music, text: 'Be the opening note.' },
	{ Icon: Anchor, text: 'Drop the first anchor.' },
	{ Icon: Telescope, text: 'Spot something on the horizon.' },
	{ Icon: Compass, text: 'Point us in a direction.' },
	{ Icon: Feather, text: 'Lay down the first feather.' },
	{ Icon: Cookie, text: 'Leave a crumb of thought.' }
] as const;

// djb2-style 32-bit string hash. Deterministic, no deps.
function hashString(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) {
		h = (h * 33) ^ s.charCodeAt(i);
	}
	// Coerce to unsigned 32-bit.
	return h >>> 0;
}

// mulberry32 PRNG — small, fast, deterministic given a seed.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function seededPermutation(n: number, seed: number): number[] {
	const out = Array.from({ length: n }, (_, i) => i);
	const rand = mulberry32(seed);
	for (let i = n - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

// Deterministic per (roomId, columnIndex). Different columns of the same room
// get distinct entries as long as the pool is at least as large as the column
// count. The largest preset template has 4 columns; pool is 12.
export function placeholderFor(roomId: string, columnIndex: number): Placeholder {
	const perm = seededPermutation(PLACEHOLDERS.length, hashString(roomId));
	return PLACEHOLDERS[perm[columnIndex % PLACEHOLDERS.length]];
}
