import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDisplayName, setDisplayName, clearDisplayName } from './displayName';

describe('displayName helper', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('round-trips a value', () => {
		setDisplayName('Dillon');
		expect(getDisplayName()).toBe('Dillon');
	});

	it('returns null when nothing has been saved', () => {
		expect(getDisplayName()).toBeNull();
	});

	it('treats an empty/whitespace value as absent', () => {
		setDisplayName('   ');
		expect(getDisplayName()).toBeNull();
	});

	it('clearDisplayName removes the value', () => {
		setDisplayName('Dillon');
		clearDisplayName();
		expect(getDisplayName()).toBeNull();
	});
});

describe('displayName helper without localStorage (SSR-like)', () => {
	const original = globalThis.localStorage;

	beforeEach(() => {
		// Simulate an environment where localStorage is undefined (e.g. SSR).
		vi.stubGlobal('localStorage', undefined);
	});

	afterEach(() => {
		vi.stubGlobal('localStorage', original);
	});

	it('getDisplayName returns null instead of throwing', () => {
		expect(() => getDisplayName()).not.toThrow();
		expect(getDisplayName()).toBeNull();
	});

	it('setDisplayName is a no-op', () => {
		expect(() => setDisplayName('x')).not.toThrow();
	});

	it('clearDisplayName is a no-op', () => {
		expect(() => clearDisplayName()).not.toThrow();
	});
});
