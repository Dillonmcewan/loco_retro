/**
 * Svelte action: shows a small floating hint after a hover delay. Uses the
 * passed label, or falls back to the element's aria-label / title. The
 * tooltip element is appended to the nearest open <dialog> ancestor — so it
 * shares the dialog's top-layer stacking context — or to <body> otherwise;
 * styling lives in app.css under `.tooltip`.
 */
const DELAY_MS = 500;
const VERTICAL_OFFSET_PX = 6;
const VIEWPORT_PADDING_PX = 4;

function nearestOpenDialog(node: HTMLElement): HTMLDialogElement | null {
	let cur: HTMLElement | null = node.parentElement;
	while (cur) {
		if (cur instanceof HTMLDialogElement && cur.open) return cur;
		cur = cur.parentElement;
	}
	return null;
}

export function tooltip(node: HTMLElement, label?: string) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let tip: HTMLDivElement | null = null;
	let currentLabel = label;

	const text = () => currentLabel ?? node.getAttribute('aria-label') ?? node.title ?? '';

	function show() {
		const t = text();
		if (!t) return;
		hide();
		tip = document.createElement('div');
		tip.className = 'tooltip';
		tip.setAttribute('role', 'tooltip');
		tip.textContent = t;
		(nearestOpenDialog(node) ?? document.body).appendChild(tip);

		const r = node.getBoundingClientRect();
		const tr = tip.getBoundingClientRect();
		const top = r.top - tr.height - VERTICAL_OFFSET_PX;
		const left = r.left + r.width / 2 - tr.width / 2;
		tip.style.top = `${Math.max(VIEWPORT_PADDING_PX, top)}px`;
		tip.style.left = `${Math.max(
			VIEWPORT_PADDING_PX,
			Math.min(left, window.innerWidth - tr.width - VIEWPORT_PADDING_PX)
		)}px`;
	}

	function hide() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (tip) {
			tip.remove();
			tip = null;
		}
	}

	function start() {
		hide();
		timer = setTimeout(show, DELAY_MS);
	}

	node.addEventListener('mouseenter', start);
	node.addEventListener('mouseleave', hide);
	node.addEventListener('focus', start);
	node.addEventListener('blur', hide);
	node.addEventListener('click', hide);

	return {
		update(next?: string) {
			currentLabel = next;
		},
		destroy() {
			hide();
			node.removeEventListener('mouseenter', start);
			node.removeEventListener('mouseleave', hide);
			node.removeEventListener('focus', start);
			node.removeEventListener('blur', hide);
			node.removeEventListener('click', hide);
		}
	};
}
