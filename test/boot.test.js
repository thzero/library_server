import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BootMain from '../boot/index.js';

// _initCleanupRegistered only reaches for the post-init registries, the two
// discovery services and the logger, so drive it against a stand-in rather than
// booting a server to reach one method.
const newHost = ({ repositories = [], services = [], resourceDiscovery = null, mdnsDiscovery = null } = {}) => {
	const exceptions = [];
	return {
		_repositoriesPost: new Map(repositories),
		_servicesPost: new Map(services),
		resourceDiscoveryServiceI: resourceDiscovery,
		mdnsDiscoveryServiceI: mdnsDiscovery,
		loggerServiceI: { exception2: (err) => exceptions.push(err) },
		exceptions,
		_initCleanupRegistered: BootMain.prototype._initCleanupRegistered
	};
};

const newCleanable = (calls, key) => ({ cleanup: async () => { calls.push(key); } });

describe('_initCleanupRegistered', () => {
	it('cleans up every registered repository and service that has a cleanup', async () => {
		const calls = [];
		const host = newHost({
			repositories: [ [ 'repoA', newCleanable(calls, 'repoA') ] ],
			services: [ [ 'svcA', newCleanable(calls, 'svcA') ] ]
		});

		const cleanupFuncs = [];
		host._initCleanupRegistered(cleanupFuncs);
		await Promise.all(cleanupFuncs);

		assert.deepEqual(calls.sort(), [ 'repoA', 'svcA' ]);
	});

	it('ignores anything without a cleanup', async () => {
		const calls = [];
		const host = newHost({
			services: [ [ 'plain', {} ], [ 'nullish', null ], [ 'notAFunction', { cleanup: true } ], [ 'svcA', newCleanable(calls, 'svcA') ] ]
		});

		const cleanupFuncs = [];
		host._initCleanupRegistered(cleanupFuncs);
		await Promise.all(cleanupFuncs);

		assert.deepEqual(calls, [ 'svcA' ]);
	});

	// The discovery services are injected like anything else, so they appear in the
	// registry too - _initCleanupDiscovery has already claimed them.
	it('does not clean the discovery services twice', async () => {
		const calls = [];
		const resourceDiscovery = newCleanable(calls, 'resource');
		const mdnsDiscovery = newCleanable(calls, 'mdns');
		const host = newHost({
			services: [ [ 'discoveryResources', resourceDiscovery ], [ 'discoveryMdns', mdnsDiscovery ], [ 'svcA', newCleanable(calls, 'svcA') ] ],
			resourceDiscovery: resourceDiscovery,
			mdnsDiscovery: mdnsDiscovery
		});

		const cleanupFuncs = [];
		host._initCleanupRegistered(cleanupFuncs);
		await Promise.all(cleanupFuncs);

		assert.deepEqual(calls, [ 'svcA' ]);
	});

	// One service failing to clean up must not abort the others, and must not take
	// the shutdown down with it.
	it('keeps going when one cleanup throws', async () => {
		const calls = [];
		const host = newHost({
			services: [
				[ 'bad', { cleanup: async () => { throw new Error('nope'); } } ],
				[ 'good', newCleanable(calls, 'good') ]
			]
		});

		const cleanupFuncs = [];
		host._initCleanupRegistered(cleanupFuncs);
		await Promise.all(cleanupFuncs);

		assert.deepEqual(calls, [ 'good' ]);
		assert.equal(host.exceptions.length, 1);
		assert.equal(host.exceptions[0].message, 'nope');
	});

	it('survives a cleanup that throws synchronously', async () => {
		const host = newHost({
			services: [ [ 'bad', { cleanup: () => { throw new Error('sync'); } } ] ]
		});

		const cleanupFuncs = [];
		host._initCleanupRegistered(cleanupFuncs);
		await Promise.all(cleanupFuncs);

		assert.equal(host.exceptions.length, 1);
	});
});

// terminus awaits onSignal before it runs onShutdown or re-raises the signal, and its
// isShuttingDown guard swallows every later SIGINT, so one cleanup that never settles
// used to wedge the process with no way out of it.
describe('_awaitCleanup', () => {
	const awaitCleanup = (cleanupFuncs, timeoutMs) =>
		BootMain.prototype._awaitCleanup.call({}, cleanupFuncs, timeoutMs);

	it('reports the sweep finished when every cleanup settles', async () => {
		assert.equal(await awaitCleanup([ Promise.resolve(), Promise.resolve() ], 1000), true);
	});

	it('reports nothing to wait for on an empty sweep', async () => {
		assert.equal(await awaitCleanup([], 1000), true);
	});

	it('gives up on a cleanup that never settles', async () => {
		// The deadline timer is unref'd, and a promise that never settles holds nothing open,
		// so without a ref'd handle of our own the loop drains and the runner cancels the test.
		const keepAlive = setTimeout(() => {}, 5000);
		try {
			const started = Date.now();
			assert.equal(await awaitCleanup([ new Promise(() => {}) ], 20), false);
			assert.ok(Date.now() - started < 2000, 'it waited past the deadline');
		}
		finally {
			clearTimeout(keepAlive);
		}
	});

	it('does not reject when a cleanup rejects', async () => {
		assert.equal(await awaitCleanup([ Promise.reject(new Error('nope')) ], 1000), true);
	});

	it('waits however long it takes when there is no usable deadline', async () => {
		let resolve;
		const slow = new Promise((r) => { resolve = r; });
		for (const timeoutMs of [ 0, -1, null, undefined, NaN ]) {
			const pending = awaitCleanup([ slow ], timeoutMs);
			const raced = await Promise.race([ pending, new Promise((r) => setTimeout(() => r('still waiting'), 30)) ]);
			assert.equal(raced, 'still waiting', 'timeoutMs ' + String(timeoutMs) + ' cut the sweep short');
		}
		resolve();
	});
});
