import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import UsageMetricsService from '../service/usageMetrics.js';

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

let service;
let calls;

beforeEach(() => {
	service = new UsageMetricsService();
	calls = { listing: [], register: [], tag: [] };
	inject(service, '_logger', { debug() {}, info() {}, info2() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} });
	inject(service, '_config', { get: () => null });
	service._serviceValidation = { check: (correlationId) => service._success(correlationId) };
	service._repositoryUsageMetricsI = {
		async listing(correlationId, params) { calls.listing.push({ correlationId, params }); return service._success(correlationId); },
		async register(usageMetrics) { calls.register.push(usageMetrics); return service._success(usageMetrics.correlationId); },
		async tag(correlationId, userId, tag) { calls.tag.push({ correlationId, userId, tag }); return service._success(correlationId); }
	};
});

// An _enforceNotNull on user used to sit at the top of both methods - dead,
// because value and name were transposed. Correcting the transposition made them
// live and every call 500'd with "user is null." Both are gone.
//
// /usageMetrics/tag carries no authentication chain at all, by design - the body
// records `user ? user.id : null`. /usageMetrics/listing now requires the admin
// role at the route, and its body never touches user, so neither needs a guard.
describe('callers without a user', () => {
	it('listing does not require a user of its own', async () => {
		const response = await service.listing('cid', undefined, {});
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(calls.listing.length, 1);
	});

	it('tag works without a user, and records no user id', async () => {
		const response = await service.tag('cid', undefined, { type: 'a' });
		assert.equal(service._hasSucceeded(response), true);
		assert.deepEqual(calls.tag, [ { correlationId: 'cid', userId: null, tag: { type: 'a' } } ]);
	});

	it('tag still records the user id when there is one', async () => {
		service._validateUser = (correlationId) => service._success(correlationId);
		await service.tag('cid', { id: 'u1' }, { type: 'a' });
		assert.equal(calls.tag[0].userId, 'u1');
	});
});

describe('tag', () => {
	// This one the body does require - it is validated and handed to the
	// repository - so the guard stays.
	it('rejects a missing tag', async () => {
		await assert.rejects(() => service.tag('cid', null, null), /tag is null/);
	});

	it('stops on a failed user validation before touching the repository', async () => {
		service._validateUser = (correlationId) => service._error('x', 'y', 'bad user', null, null, null, correlationId);
		const response = await service.tag('cid', { id: 'u1' }, { type: 'a' });
		assert.equal(service._hasFailed(response), true);
		assert.equal(calls.tag.length, 0);
	});

	it('stops on a failed tag validation before touching the repository', async () => {
		service._serviceValidation = { check: (correlationId) => service._error('x', 'y', 'bad tag', null, null, null, correlationId) };
		const response = await service.tag('cid', null, { type: 'a' });
		assert.equal(service._hasFailed(response), true);
		assert.equal(calls.tag.length, 0);
	});
});

describe('register', () => {
	it('stamps the date and hands the record to the repository', async () => {
		const before = Date.now();
		const response = await service.register({ correlationId: 'cid', url: '/users' });
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(calls.register.length, 1);
		// This used to be new Date(new Date(ts).toISOString()): a Date, an ISO
		// string, a parse and a second Date, on every response, to get "now".
		assert.ok(calls.register[0].date instanceof Date);
		assert.ok(calls.register[0].date.getTime() >= before);
	});

	it('records nothing for a null record', async () => {
		await service.register(null);
		assert.equal(calls.register.length, 0);
	});
});

describe('registerIgnore', () => {
	it('exempts a url from being recorded', async () => {
		service.registerIgnore('/health');
		assert.equal(service._ignore.has('/health'), true);
		await service.register({ correlationId: 'cid', url: '/health' });
		assert.equal(calls.register.length, 0);
	});
});
