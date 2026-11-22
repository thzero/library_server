import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { internalIpV4, internalIpV4Sync } from '../utility/internalIp/index.js';

// Regression: the gateway functions were looked up by their pre-7 names, the
// TypeError was swallowed, and every lookup returned undefined. Any machine
// running the tests has some external IPv4 address, either through the gateway
// or through the fallback.
describe('internalIp', () => {
	const isIpV4 = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value);

	it('internalIpV4 finds an address', async () => {
		assert.ok(isIpV4(await internalIpV4()));
	});

	it('internalIpV4Sync finds an address', () => {
		assert.ok(isIpV4(internalIpV4Sync()));
	});
});
