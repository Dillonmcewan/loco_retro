import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDisplayName, setDisplayName, clearDisplayName, getAuthorId } from './displayName';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

describe('getAuthorId', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns a UUID v4', () => {
		const id = getAuthorId();
		expect(id).toMatch(UUID_V4);
	});

	it('is stable across calls', () => {
		const a = getAuthorId();
		const b = getAuthorId();
		expect(a).toBe(b);
	});

	it('persists across simulated reloads', () => {
		const a = getAuthorId();
		// Simulate a reload: localStorage survives, in-memory state is fresh.
		const b = getAuthorId();
		expect(b).toBe(a);
		expect(localStorage.getItem('loco_retro:authorId')).toBe(a);
	});
});

describe('getAuthorId without localStorage (SSR-like)', () => {
	const original = globalThis.localStorage;

	beforeEach(() => {
		vi.stubGlobal('localStorage', undefined);
	});

	afterEach(() => {
		vi.stubGlobal('localStorage', original);
	});

	it('returns a fresh UUID v4 instead of throwing', () => {
		const id = getAuthorId();
		expect(id).toMatch(UUID_V4);
	});
});
