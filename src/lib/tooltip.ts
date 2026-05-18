/**
 * Svelte action: shows a small floating hint after a hover delay. Accepts a
 * label string or an options object `{ text, delay, showOnClick }`. Falls back
 * to the element's aria-label / title if no text is given. Styling lives in
 * app.css under `.tooltip`.
 *
 * Portal target: the tip is appended to the nearest open <dialog> ancestor,
 * not <body>. A <dialog> opened via showModal() renders in the browser's top
 * layer, which sits above everything else in the document — a tip appended to
 * <body> would render *behind* the modal. Falls back to <body> when no open
 * dialog is in the chain.
 */
const DEFAULT_DELAY_MS = 500;
const VERTICAL_OFFSET_PX = 6;
const VIEWPORT_PADDING_PX = 4;

export type TooltipOptions = {
	text?: string;
	delay?: number;
	/** Clicking the element opens the tooltip instead of dismissing it. */
	showOnClick?: boolean;
};

export type TooltipParam = string | TooltipOptions | undefined;

type Normalized = { text?: string; delay: number; showOnClick: boolean };

function normalize(p: TooltipParam): Normalized {
	if (typeof p === 'string') return { text: p, delay: DEFAULT_DELAY_MS, showOnClick: false };
	if (!p) return { text: undefined, delay: DEFAULT_DELAY_MS, showOnClick: false };
	return {
		text: p.text,
		delay: p.delay ?? DEFAULT_DELAY_MS,
		showOnClick: !!p.showOnClick
	};
}

function nearestOpenDialog(node: HTMLElement): HTMLDialogElement | null {
	let cur: HTMLElement | null = node.parentElement;
	while (cur) {
		if (cur instanceof HTMLDialogElement && cur.open) return cur;
		cur = cur.parentElement;
	}
	return null;
}

export function tooltip(node: HTMLElement, param?: TooltipParam) {
	let opts = normalize(param);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let tip: HTMLDivElement | null = null;

	const text = () => opts.text ?? node.getAttribute('aria-label') ?? node.title ?? '';

	function show() {
		if (node.matches(':disabled')) return;
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
		timer = setTimeout(show, opts.delay);
	}

	function onClick() {
		if (opts.showOnClick) {
			// Click opens immediately, bypassing the hover delay.
			show();
		} else {
			hide();
		}
	}

	node.addEventListener('mouseenter', start);
	node.addEventListener('mouseleave', hide);
	node.addEventListener('focus', start);
	node.addEventListener('blur', hide);
	node.addEventListener('click', onClick);

	return {
		update(next?: TooltipParam) {
			opts = normalize(next);
		},
		destroy() {
			hide();
			node.removeEventListener('mouseenter', start);
			node.removeEventListener('mouseleave', hide);
			node.removeEventListener('focus', start);
			node.removeEventListener('blur', hide);
			node.removeEventListener('click', onClick);
		}
	};
}
