import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement the HTMLDialogElement modal API. Stub the bits we
// rely on (showModal/close/open) so components using <dialog showModal()> can
// mount in tests without throwing.
if (typeof HTMLDialogElement !== 'undefined') {
	const proto = HTMLDialogElement.prototype as HTMLDialogElement & {
		showModal: () => void;
		close: () => void;
	};
	if (typeof proto.showModal !== 'function') {
		proto.showModal = function () {
			this.setAttribute('open', '');
		};
	}
	if (typeof proto.close !== 'function') {
		proto.close = function () {
			this.removeAttribute('open');
			this.dispatchEvent(new Event('close'));
		};
	}
}
