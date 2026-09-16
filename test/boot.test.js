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
