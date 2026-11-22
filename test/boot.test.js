import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BootMain from '../boot/index.js';
import BootPlugin from '../boot/plugins/index.js';

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

describe('_initCleanupDiscovery', () => {
	const run = (host) => {
		host._initCleanupDiscovery = BootMain.prototype._initCleanupDiscovery;
		const cleanupFuncs = [];
		host._initCleanupDiscovery(cleanupFuncs);
		return cleanupFuncs;
	};

	it('cleans up both discovery services', async () => {
		const calls = [];
		const host = newHost({ resourceDiscovery: newCleanable(calls, 'resource'), mdnsDiscovery: newCleanable(calls, 'mdns') });
		await Promise.all(run(host));
		assert.deepEqual(calls.sort(), [ 'mdns', 'resource' ]);
	});

	it('a rejecting discovery cleanup is logged and does not cut the sweep short', async () => {
		let finished = false;
		const slow = new Promise((resolve) => setTimeout(() => { finished = true; resolve(); }, 30));
		const host = newHost({ resourceDiscovery: { cleanup: async () => { throw new Error('nope'); } } });

		const cleanupFuncs = [ ...run(host), slow ];
		assert.equal(await BootMain.prototype._awaitCleanup.call({}, cleanupFuncs, 1000), true);
		assert.equal(finished, true);
		assert.equal(host.exceptions.length, 1);
	});

	it('a discovery cleanup that throws synchronously does not throw out of the sweep', async () => {
		const host = newHost({ mdnsDiscovery: { cleanup: () => { throw new Error('sync'); } } });
		await Promise.all(run(host));
		assert.equal(host.exceptions.length, 1);
	});
});

describe('_awaitCleanup with an unguarded rejection', () => {
	it('still waits for the other cleanups', async () => {
		let finished = false;
		const slow = new Promise((resolve) => setTimeout(() => { finished = true; resolve(); }, 30));
		const rejected = Promise.reject(new Error('nope'));
		assert.equal(await BootMain.prototype._awaitCleanup.call({}, [ rejected, slow ], 1000), true);
		assert.equal(finished, true);
	});
});

describe('injectCheck', () => {
	const newInjector = () => {
		const di = {};
		return { getInjector: () => di, addSingleton: (key, value) => { if (!di[key]) di[key] = { singleton: true, dependency: value }; } };
	};

	it('throws for any key that is already registered', () => {
		const plugin = new BootPlugin();
		plugin._injector = newInjector();
		assert.doesNotThrow(() => plugin._injectCheck('services', 'svc'));
		plugin._injector.addSingleton('svc', { name: 'first' });
		assert.throws(() => plugin._injectCheck('services', 'svc'), /'svc' is already registered/);
	});

	it('throws when the same instance is registered twice', () => {
		const injectorI = newInjector();
		const plugin = new BootPlugin();
		plugin._injector = injectorI;
		plugin._services = new Map();
		const first = { name: 'first' };
		plugin._injectService('svc', first);
		assert.throws(() => plugin._injectService('svc', first), /'svc' is already registered/);
	});

	it('a plugin registering a taken key throws and leaves its map alone', () => {
		const injectorI = newInjector();
		const plugin = new BootPlugin();
		plugin._injector = injectorI;
		plugin._services = new Map();
		plugin._injectService('svc', { name: 'first' });
		assert.throws(() => plugin._injectService('svc', { name: 'second' }), /'svc' is already registered/);
		assert.equal(plugin._services.get('svc').name, 'first');
		assert.equal(injectorI.getInjector().svc.dependency.name, 'first');
	});
});

describe('_initServerDiscoveryOpts', () => {
	const optsFor = (path) => {
		const host = {
			address: '10.0.0.1',
			port: 3000,
			_appConfig: { get: (key, defaultValue) => (key === 'healthcheck.path') ? (path ?? defaultValue) : defaultValue },
			_healthcheckPath: BootMain.prototype._healthcheckPath
		};
		return BootMain.prototype._initServerDiscoveryOpts.call(host);
	};

	it('gives discovery the configured health check path', async () => {
		assert.equal((await optsFor('/status/health')).healthCheck, 'status/health');
		assert.equal((await optsFor('ping')).healthCheck, 'ping');
	});

	it('falls back to the default path', async () => {
		assert.equal((await optsFor(undefined)).healthCheck, 'healthcheck');
	});
});

describe('_crash', () => {
	let exits;

	const newCrashHost = ({ repositories = [], services = [], flush = null, config = null, shuttingDown = false, logger = true } = {}) => {
		const logged = [];
		const host = {
			_repositoriesPost: new Map(repositories),
			_servicesPost: new Map(services),
			resourceDiscoveryServiceI: null,
			mdnsDiscoveryServiceI: null,
			loggerServiceI: logger ? { exception2: (err) => logged.push(err), flush } : null,
			_appConfig: config ? { get: (key, defaultValue) => config[key] ?? defaultValue } : null,
			_shuttingDown: shuttingDown,
			logged
		};
		for (const name of [ '_crash', '_flushLogger', '_awaitCleanup', '_initCleanup', '_initCleanupDiscovery', '_initCleanupRegistered' ])
			host[name] = BootMain.prototype[name];
		return host;
	};

	const stubExit = () => {
		exits = [];
		mock.method(process, 'exit', (code) => { exits.push(code); });
	};

	afterEach(() => {
		mock.restoreAll();
		process.exitCode = undefined;
	});

	it('runs the cleanup sweep and flushes the logger before exiting 99', async () => {
		stubExit();
		const order = [];
		const host = newCrashHost({
			repositories: [ [ 'metrics', { cleanup: async () => { order.push('cleanup'); } } ] ],
			flush: async () => { order.push('flush'); }
		});
		await host._crash(new Error('boom'));
		assert.deepEqual(order, [ 'cleanup', 'flush' ]);
		assert.deepEqual(exits, [ 99 ]);
		assert.equal(host.logged.length, 1, 'the exception goes to the logger');
	});

	it('gives up on a cleanup that hangs and still exits', async () => {
		stubExit();
		const keepAlive = setTimeout(() => {}, 5000);
		try {
			const host = newCrashHost({
				repositories: [ [ 'stuck', { cleanup: () => new Promise(() => {}) } ] ],
				config: { 'shutdown.crashTimeoutMs': 20 }
			});
			const started = Date.now();
			await host._crash(new Error('boom'));
			assert.ok(Date.now() - started < 2000);
			assert.deepEqual(exits, [ 99 ]);
		}
		finally {
			clearTimeout(keepAlive);
		}
	});

	it('does not run the sweep again when a shutdown is already cleaning up', async () => {
		stubExit();
		let cleanups = 0;
		const host = newCrashHost({ shuttingDown: true, repositories: [ [ 'r', { cleanup: async () => { cleanups++; } } ] ] });
		await host._crash(new Error('boom'));
		assert.equal(cleanups, 0);
		assert.deepEqual(exits, [ 99 ]);
	});

	it('exits at once on a second exception while handling the first', async () => {
		stubExit();
		const host = newCrashHost();
		host._crashing = true;
		await host._crash(new Error('again'));
		assert.deepEqual(exits, [ 99 ]);
	});

	it('exits 99 when the crash comes before the logger exists', async () => {
		stubExit();
		const host = newCrashHost({ logger: false });
		await host._crash(new Error('early'));
		assert.deepEqual(exits, [ 99 ]);
	});
});
