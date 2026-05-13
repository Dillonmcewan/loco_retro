import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { tick } from 'svelte';
import ClosedCelebration from './ClosedCelebration.svelte';

describe('ClosedCelebration.svelte', () => {
	beforeEach(() => {
		// Reset the URL so ?celebration= overrides from earlier tests don't leak.
		window.history.replaceState({}, '', '/');
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does NOT play when mounted directly into the closed phase (initial-load skip)', async () => {
		const { container } = render(ClosedCelebration, {
			props: { phase: 'closed', roomId: 'room-1' }
		});
		await tick();
		expect(container.querySelector('.celebration')).toBeNull();
	});

	it('plays when the phase transitions from a non-closed phase to closed', async () => {
		const { container, rerender } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await tick();
		expect(container.querySelector('.celebration')).toBeNull();

		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();
		expect(container.querySelector('.celebration')).not.toBeNull();
	});

	it('the ?celebration=<id> URL override picks the named variant', async () => {
		window.history.replaceState({}, '', '/?celebration=disco');
		const { container, rerender } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();

		// Disco variant carries the disco-show class on its root.
		expect(container.querySelector('.disco-show')).not.toBeNull();
	});

	it('falls back to deterministic per-room pick when the override is unknown', async () => {
		window.history.replaceState({}, '', '/?celebration=not-a-variant');
		const { container, rerender } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();
		// Still plays — the unknown id is ignored, deterministic pick kicks in.
		expect(container.querySelector('.celebration')).not.toBeNull();
	});

	it('auto-dismisses after 6500ms', async () => {
		const { container, rerender } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();
		expect(container.querySelector('.celebration')).not.toBeNull();

		vi.advanceTimersByTime(6500);
		await tick();
		expect(container.querySelector('.celebration')).toBeNull();
	});

	it('does not fire the dismiss timer after unmount', async () => {
		// Regression guard for commit 9b91522: timer survived unmount and
		// stomped on Svelte's reactivity after the component was gone.
		const { rerender, unmount } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();
		unmount();
		// Advancing past TOTAL_MS must not throw — the returned $effect.pre
		// cleanup is responsible for clearing the timer.
		expect(() => vi.advanceTimersByTime(7000)).not.toThrow();
	});

	it('clicking the dismiss backdrop removes the celebration', async () => {
		// userEvent disagrees with fake timers; use real for this test.
		vi.useRealTimers();
		const user = userEvent.setup();
		const { container, rerender } = render(ClosedCelebration, {
			props: { phase: 'discuss', roomId: 'room-1' }
		});
		await rerender({ phase: 'closed', roomId: 'room-1' });
		await tick();
		expect(container.querySelector('.celebration')).not.toBeNull();

		await user.click(screen.getByRole('button', { name: /dismiss celebration/i }));
		await tick();
		expect(container.querySelector('.celebration')).toBeNull();
	});
});
