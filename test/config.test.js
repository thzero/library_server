import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import ServerConfigService from '../service/config.js';

// The shape node-config presents: get() throws on an unknown key, has() answers
// without throwing.
const provider = (values) => {
	const calls = { get: 0, has: 0 };
	return {
		calls,
		has(key) { calls.has++; return key in values; },
		get(key) {
			calls.get++;
			if (!(key in values))
				throw new Error(`Configuration property "${key}" is not defined`);
			return values[key];
		}
	};
};

const newService = (values) => {
	const config = provider(values);
	const service = new ServerConfigService(config);
	service.errors = [];
	// _error hands an err to exception() and a message to error(); count both.
	service._logger = {
		debug() {}, info() {}, warn() {}, fatal() {}, trace() {},
		error(...args) { service.errors.push(args); },
		exception(...args) { service.errors.push(args); }
	};
	return { service, config };
};

const backends = [
	{ key: 'Users', baseUrl: 'http://users/' },
	{ key: 'billing', baseUrl: 'http://billing/' },
	{ key: 'users', baseUrl: 'http://users-duplicate/' }
];

describe('getBackend', () => {
	it('finds a backend by key, ignoring case', () => {
		const { service } = newService({ backend: backends });
		assert.equal(service.getBackend('cid', 'users').baseUrl, 'http://users/');
		assert.equal(service.getBackend('cid', 'USERS').baseUrl, 'http://users/');
		assert.equal(service.getBackend('cid', 'Billing').baseUrl, 'http://billing/');
	});

	it('returns null for an unknown key, an empty key, or no backend list', () => {
		const { service } = newService({ backend: backends });
		assert.equal(service.getBackend('cid', 'nope'), null);
		assert.equal(service.getBackend('cid', ''), null);
		assert.equal(service.getBackend('cid', null), null);
		assert.equal(newService({}).service.getBackend('cid', 'users'), null);
		assert.equal(newService({ backend: 'not a list' }).service.getBackend('cid', 'users'), null);
	});

	it('the first entry wins when a key is duplicated, as the scan did', () => {
		const { service } = newService({ backend: backends });
		assert.equal(service.getBackend('cid', 'users').baseUrl, 'http://users/');
	});

	it('skips entries without a key rather than failing the lookup', () => {
		const { service } = newService({ backend: [ null, {}, { key: 'ok' } ] });
		assert.equal(service.getBackend('cid', 'ok').key, 'ok');
		assert.equal(service.errors.length, 0);
	});

	// The list is static config. It used to be re-read and re-lowercased on
	// every outbound call.
	it('reads and indexes the list once', () => {
		const { service, config } = newService({ backend: backends });
		service.getBackend('cid', 'users');
		service.getBackend('cid', 'billing');
		service.getBackend('cid', 'nope');
		assert.equal(config.calls.get, 1);
	});

	// Regression: the list was read from the raw provider with a default the
	// provider does not understand, so with no backend configured every call
	// threw, was caught, and logged an error before returning null.
	//
	// Whether the base get() asks has() first or lets the provider throw depends
	// on the published @thzero/library_common_service this package resolves, so
	// that is asserted in that package's tests, not here.
	it('with no backend configured, returns null without logging', () => {
		const { service, config } = newService({});
		assert.equal(service.getBackend('cid', 'users'), null);
		assert.equal(service.getBackend('cid', 'users'), null);
		assert.equal(service.errors.length, 0);
		assert.ok(config.calls.get + config.calls.has <= 1, 'the provider is consulted once, then the empty index is reused');
	});
});
