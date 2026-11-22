import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import ResourcesDiscoveryService from '../service/discovery/resources/index.js';

const logger = { debug() {}, info() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} };

const newService = (overrides) => {
	const service = new ResourcesDiscoveryService();
	Object.defineProperty(service, '_logger', { value: logger, writable: true, configurable: true });
	Object.assign(service, overrides);
	return service;
};

describe('ResourcesDiscoveryService', () => {
	// Regression: the name was dropped on the way to _deregister.
	it('deregister passes the name through', async () => {
		let received;
		const service = newService({ _deregister: async (correlationId, name) => { received = name; return 'ok'; } });
		assert.equal(await service.deregister('cid', 'svc-a'), 'ok');
		assert.equal(received, 'svc-a');
	});

	// Regression: each wrapper returned the promise without awaiting it, so a
	// rejection escaped the try and came back as a rejected promise.
	for (const [ method, impl, args ] of [
		[ 'cleanup', '_cleanup', [ 'cid' ] ],
		[ 'deregister', '_deregister', [ 'cid', 'svc-a' ] ],
		[ 'getService', '_getService', [ 'cid', 'svc-a' ] ],
		[ 'listing', '_listing', [ 'cid' ] ]
	]) {
		it(`${method} turns a rejection into a failed response`, async () => {
			const service = newService({ [impl]: async () => { throw new Error('nope'); } });
			const response = await service[method](...args);
			assert.equal(service._hasFailed(response), true);
		});
	}
});
