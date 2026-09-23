import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import '@thzero/library_common/utility/string.js';
import LibraryMomentUtility from '@thzero/library_common/utility/moment.js';
import UtilityService from '../service/utility.js';

// dayjs.utc() only exists once the plugins are registered; the app does this at
// boot, so anything calling getTimestamp() outside a booted app must do it too.
LibraryMomentUtility.initDateTime();

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

const TTL = 1000 * 30;

let service;
let warnings;
let builds;
let planResults;
let planFailure;
let gate;

// Every build reads planResults at the time it runs, so a test can change what
// the next refresh will return. `gate` holds a build open until released.
const newService = () => {
	const instance = new UtilityService();
	warnings = [];
	builds = 0;
	planResults = [ { id: 'free' } ];
	planFailure = null;
	gate = null;
	inject(instance, '_logger', {
		debug() {}, info() {}, error() {}, exception() {}, fatal() {}, trace() {},
		warn(clazz, method, message, data) { warnings.push({ message, data }); }
	});
	inject(instance, '_config', { get: () => null });
	instance._servicePlans = {
		async listing(correlationId) {
			builds++;
			if (gate)
				await gate;
			if (planFailure)
				return instance._error('x', 'y', planFailure, null, null, null, correlationId);
			return instance._successResponse(planResults, correlationId);
		}
	};
	instance._serviceVersion = {
		async version(correlationId) { return instance._successResponse({ version: '1.0.0' }, correlationId); }
	};
	return instance;
};

// Lets a background refresh run to completion.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	mock.timers.enable({ apis: [ 'Date' ], now: 1_000_000 });
	service = newService();
});

afterEach(() => {
	mock.timers.reset();
});

describe('initialize, cold', () => {
	it('builds the response and caches it', async () => {
		const response = await service.initialize('cid');
		assert.equal(service._hasSucceeded(response), true);
		assert.deepEqual(response.results.plans, [ { id: 'free' } ]);
		assert.equal(response.results.version.version, '1.0.0');
		assert.equal(builds, 1);
		assert.equal(service._initializeResponse, response);
	});

	it('shares one build between concurrent callers', async () => {
		const responses = await Promise.all([ service.initialize('a'), service.initialize('b'), service.initialize('c') ]);
		assert.equal(builds, 1);
		assert.equal(responses[1], responses[0]);
		assert.equal(responses[2], responses[0]);
	});

	it('returns a failed build to the caller and caches nothing', async () => {
		planFailure = 'plans down';
		const response = await service.initialize('cid');
		assert.equal(service._hasFailed(response), true);
		assert.equal(service._initializeResponse, null);
		assert.equal(warnings.length, 0, 'nothing to fall back on, so nothing to warn about');

		planFailure = null;
		const retry = await service.initialize('cid');
		assert.equal(service._hasSucceeded(retry), true);
		assert.equal(builds, 2);
	});

	it('turns an exception in the build into an error response', async () => {
		service._serviceVersion = { async version() { throw new Error('boom'); } };
		const response = await service.initialize('cid');
		assert.equal(service._hasFailed(response), true);
		assert.equal(service._initializeResponse, null);
	});
});

describe('initialize, within the TTL', () => {
	it('serves the cached response without rebuilding', async () => {
		const first = await service.initialize('cid');
		mock.timers.tick(TTL);
		const second = await service.initialize('cid');
		assert.equal(second, first);
		assert.equal(builds, 1);
	});
});

describe('initialize, past the TTL', () => {
	// Regression. The check inside the old mutex was `if (this._initializeResponse)`,
	// with no look at the TTL, so once it had passed every call queued on the lock
	// and got the same response back, and the cache never refreshed.
	it('serves the stale response at once and refreshes in the background', async () => {
		const first = await service.initialize('cid');
		mock.timers.tick(TTL + 1);

		planResults = [ { id: 'free' }, { id: 'pro' } ];
		let release;
		gate = new Promise((resolve) => { release = resolve; });

		const stale = await service.initialize('cid');
		assert.equal(stale, first, 'the caller is not made to wait on the refresh');
		assert.equal(builds, 2, 'the refresh has started');

		release();
		await settle();

		const fresh = await service.initialize('cid');
		assert.notEqual(fresh, first);
		assert.deepEqual(fresh.results.plans, [ { id: 'free' }, { id: 'pro' } ]);
		assert.equal(builds, 2);
	});

	it('runs one refresh however many calls arrive while it is in flight', async () => {
		const first = await service.initialize('cid');
		mock.timers.tick(TTL + 1);

		let release;
		gate = new Promise((resolve) => { release = resolve; });

		const responses = await Promise.all([ service.initialize('a'), service.initialize('b'), service.initialize('c') ]);
		assert.deepEqual(responses, [ first, first, first ]);
		assert.equal(builds, 2);

		release();
		await settle();
	});

	it('refreshes again once the new response has aged past the TTL', async () => {
		await service.initialize('cid');
		mock.timers.tick(TTL + 1);
		await service.initialize('cid');
		await settle();
		assert.equal(builds, 2);

		mock.timers.tick(TTL);
		await service.initialize('cid');
		assert.equal(builds, 2, 'the refreshed response is fresh again');

		mock.timers.tick(1);
		await service.initialize('cid');
		assert.equal(builds, 3);
	});
});

describe('initialize, failed refresh', () => {
	it('keeps serving the previous response and warns once', async () => {
		const first = await service.initialize('cid');
		mock.timers.tick(TTL + 1);

		planFailure = 'plans down';
		const stale = await service.initialize('cid');
		await settle();
		assert.equal(stale, first);
		assert.equal(service._initializeResponse, first);
		assert.equal(warnings.length, 1);
		assert.match(warnings[0].message, /previous response/);
	});

	it('backs off for one TTL before trying again', async () => {
		await service.initialize('cid');
		mock.timers.tick(TTL + 1);

		planFailure = 'plans down';
		await service.initialize('cid');
		await settle();
		assert.equal(builds, 2);

		await service.initialize('cid');
		await settle();
		assert.equal(builds, 2, 'not asked again straight away');

		planFailure = null;
		planResults = [ { id: 'pro' } ];
		mock.timers.tick(TTL + 1);
		await service.initialize('cid');
		await settle();
		assert.equal(builds, 3);
		const fresh = await service.initialize('cid');
		assert.deepEqual(fresh.results.plans, [ { id: 'pro' } ]);
	});
});
