import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BaseNewsService from '../service/news/base.js';

const logger = { debug() {}, info() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} };

const newService = (results) => {
	const service = new BaseNewsService();
	Object.defineProperty(service, '_logger', { value: logger, writable: true, configurable: true });
	const asked = [];
	service._serviceValidation = { check: (correlationId) => service._success(correlationId) };
	service._serviceValidationNews = { newsTimestampSchema: {} };
	service._repositoryNewsI = { latest: async (correlationId, timestamp) => { asked.push(timestamp); return service._successResponse(results, correlationId); } };
	return { service, asked };
};

describe('BaseNewsService.latest', () => {
	// Regression: an empty timestamp threw out of latest (a 500) instead of
	// coming back as a failed response.
	for (const timestamp of [ null, undefined, '' ]) {
		it(`returns a failed response for timestamp ${String(timestamp)}`, async () => {
			const { service, asked } = newService({ data: [] });
			const response = await service.latest('cid', null, timestamp);
			assert.equal(service._hasFailed(response), true);
			assert.equal(asked.length, 0);
		});
	}

	it('returns a failed response for a timestamp that is not a number', async () => {
		const { service, asked } = newService({ data: [] });
		const response = await service.latest('cid', null, 'abc');
		assert.equal(service._hasFailed(response), true);
		assert.equal(asked.length, 0);
	});

	it('accepts zero', async () => {
		const { service, asked } = newService({ data: [] });
		const response = await service.latest('cid', null, '0');
		assert.equal(service._hasSucceeded(response), true);
		assert.deepEqual(asked, [ 0 ]);
	});

	// Regression: data.length threw on a null data.
	it('treats missing data as an empty list', async () => {
		const { service } = newService({ data: null });
		const response = await service.latest('cid', null, '100');
		assert.equal(service._hasSucceeded(response), true);
		assert.deepEqual(response.results.data, []);
		assert.equal(response.results.count, 0);
	});

	it('leaves out news that requires auth for an anonymous caller', async () => {
		const data = [ { id: 1, requiresAuth: true }, { id: 2, requiresAuth: false } ];
		const anonymous = await newService({ data: [ ...data ] }).service.latest('cid', null, '100');
		assert.deepEqual(anonymous.results.data.map(l => l.id), [ 2 ]);
		const signedIn = await newService({ data: [ ...data ] }).service.latest('cid', { id: 'u' }, '100');
		assert.deepEqual(signedIn.results.data.map(l => l.id), [ 1, 2 ]);
	});
});

describe('BaseNewsService.latest, repository options', () => {
	const newCapturing = (limit) => {
		const service = new BaseNewsService();
		Object.defineProperty(service, '_logger', { value: logger, writable: true, configurable: true });
		const options = [];
		service._serviceValidation = { check: (correlationId) => service._success(correlationId) };
		service._serviceValidationNews = { newsTimestampSchema: {} };
		service._repositoryNewsI = { latest: async (correlationId, timestamp, opts) => { options.push(opts); return service._successResponse({ data: [] }, correlationId); } };
		if (limit !== undefined)
			service._latestLimit = limit;
		return { service, options };
	};

	it('asks for the default limit and says whether the caller is signed in', async () => {
		const { service, options } = newCapturing();
		await service.latest('cid', null, '100');
		await service.latest('cid', { id: 'u' }, '100');
		assert.deepEqual(options, [ { authenticated: false, limit: 50 }, { authenticated: true, limit: 50 } ]);
	});

	it('a limit of 0 asks for everything', async () => {
		const { service, options } = newCapturing(0);
		await service.latest('cid', null, '100');
		assert.equal(options[0].limit, null);
	});
});
