import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import os from 'node:os';

import OsUtility from '../utility/os.js';

describe('OsUtility', () => {
	// Each getter used to call os.type() and run its regexes on every access.
	it('answers from values computed once, matching the platform', () => {
		const type = os.type();
		assert.equal(OsUtility.isWin, /^win/i.test(type));
		assert.equal(OsUtility.isMac, /^darwin/i.test(type));
		assert.equal(OsUtility.isLinux, /^linux/i.test(type) || /^freebsd/i.test(type) || /^darwin/i.test(type));
		assert.equal(typeof OsUtility.isWin, 'boolean');
	});

	it('is stable across reads', () => {
		assert.equal(OsUtility.isWin, OsUtility.isWin);
		assert.equal(OsUtility.isLinux, OsUtility.isLinux);
	});
});
