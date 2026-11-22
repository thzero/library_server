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
		assert.equal(service._initializeResponse.results, response.results);
		assert.equal(response.correlationId, 'cid');
	});

	it('shares one build between concurrent callers', async () => {
		const responses = await Promise.all([ service.initialize('a'), service.initialize('b'), service.initialize('c') ]);
		assert.equal(builds, 1);
		assert.equal(responses[1].results, responses[0].results);
		assert.equal(responses[2].results, responses[0].results);
		assert.deepEqual(responses.map(r => r.correlationId), [ 'a', 'b', 'c' ]);
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
		assert.equal(second.results, first.results);
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
		assert.equal(stale.results, first.results, 'the caller is not made to wait on the refresh');
		assert.equal(builds, 2, 'the refresh has started');

		release();
		await settle();

		const fresh = await service.initialize('cid');
		assert.notEqual(fresh.results, first.results);
		assert.deepEqual(fresh.results.plans, [ { id: 'free' }, { id: 'pro' } ]);
		assert.equal(builds, 2);
	});

	it('runs one refresh however many calls arrive while it is in flight', async () => {
		const first = await service.initialize('cid');
		mock.timers.tick(TTL + 1);

		let release;
		gate = new Promise((resolve) => { release = resolve; });

		const responses = await Promise.all([ service.initialize('a'), service.initialize('b'), service.initialize('c') ]);
		assert.deepEqual(responses.map(r => r.results), [ first.results, first.results, first.results ]);
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
		assert.equal(stale.results, first.results);
		assert.equal(service._initializeResponse.results, first.results);
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

describe('logger', () => {
	let logged;
	const newLoggerService = (config) => {
		const instance = new UtilityService();
		logged = [];
		const record = (level) => (clazz, method, message, data, correlationId, isClient) => logged.push({ level, message, data, correlationId, isClient });
		inject(instance, '_logger', {
			debug: record('debug'), info: record('info'), warn: record('warn'), error: record('error'), fatal: record('fatal'), trace: record('trace'),
			exception: (clazz, method, ex, correlationId, isClient) => logged.push({ level: 'exception', data: ex, correlationId, isClient })
		});
		inject(instance, '_config', { get: (key, defaultValue) => (key === 'logging.client') ? (config ?? defaultValue) : defaultValue });
		instance._initLoggerClient();
		return instance;
	};

	it('logs what the routes send, in the order they send it', async () => {
		const instance = newLoggerService();
		const response = await instance.logger('cid', { type: 'WARN', message: 'hello', data: { a: 1 } });
		assert.equal(instance._hasSucceeded(response), true);
		assert.deepEqual(logged, [ { level: 'warn', message: 'hello', data: { a: 1 }, correlationId: 'cid', isClient: true } ]);
	});

	it('refuses missing content', async () => {
		const instance = newLoggerService();
		assert.equal(instance._hasFailed(await instance.logger('cid', null)), true);
		assert.equal(instance._hasFailed(await instance.logger('cid', 'text')), true);
		assert.equal(logged.filter(l => l.isClient).length, 0, 'nothing written as a client entry');
	});

	it('records a client FATAL as fatal', async () => {
		const instance = newLoggerService();
		await instance.logger('cid', { type: 'FATAL', message: 'boom' });
		assert.equal(logged[0].level, 'fatal');
	});

	it('cuts a long message to the configured length', async () => {
		const instance = newLoggerService({ maxMessageLength: 10 });
		await instance.logger('cid', { type: 'INFO', message: 'x'.repeat(50) });
		assert.match(logged[0].message, /^x{10}\.\.\. \[truncated, 50 characters\]$/);
	});

	it('replaces data that is too large with a preview', async () => {
		const instance = newLoggerService({ maxDataLength: 20 });
		await instance.logger('cid', { type: 'INFO', message: 'm', data: { big: 'y'.repeat(100) } });
		assert.equal(logged[0].data.truncated, true);
		assert.equal(logged[0].data.preview.length, 20);
		assert.ok(logged[0].data.length > 100);
	});

	it('limits an exception payload the same way as data', async () => {
		const instance = newLoggerService({ maxDataLength: 20 });
		await instance.logger('cid', { type: 'EXCEPTION', ex: { message: 'z'.repeat(100) } });
		assert.equal(logged[0].level, 'exception');
		assert.equal(logged[0].data.truncated, true);
	});

	it('drops entries past the rate, answers success, and warns once with the count', async () => {
		const instance = newLoggerService({ maxPerSecond: 2 });
		for (let i = 0; i < 5; i++)
			assert.equal(instance._hasSucceeded(await instance.logger('cid', { type: 'INFO', message: `m${i}` })), true);
		assert.deepEqual(logged.map(l => l.message), [ 'm0', 'm1' ]);

		mock.timers.tick(1000);
		await instance.logger('cid', { type: 'INFO', message: 'next' });
		assert.equal(logged[2].level, 'warn');
		assert.match(logged[2].message, /Dropped 3 client log entries/);
		assert.equal(logged[3].message, 'next');
	});

	it('a limit of 0 turns it off', async () => {
		const instance = newLoggerService({ maxPerSecond: 0, maxMessageLength: 0 });
		for (let i = 0; i < 100; i++)
			await instance.logger('cid', { type: 'INFO', message: 'x'.repeat(5000) });
		assert.equal(logged.length, 100);
		assert.equal(logged[0].message.length, 5000);
	});
});
