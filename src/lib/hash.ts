// djb2-style 32-bit string hash. Deterministic, no deps. Used to seed
// per-room deterministic picks (column placeholders, closing celebration
// variant, etc.).
export function hashString(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) {
		h = (h * 33) ^ s.charCodeAt(i);
	}
	// Coerce to unsigned 32-bit.
	return h >>> 0;
}
