import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import '@thzero/library_common/utility/string.js';
import UtilityService from '../service/utility.js';

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

// A fake node_modules/@thzero with three packages: two carry an openSource.js,
// one does not.
let dir;

before(async () => {
	dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'opensource-'));
	for (const name of [ 'alpha', 'beta', 'gamma' ])
		await fs.promises.mkdir(path.join(dir, name));
	await fs.promises.writeFile(path.join(dir, 'alpha', 'openSource.js'), '');
	await fs.promises.writeFile(path.join(dir, 'gamma', 'openSource.js'), '');
});

after(async () => {
	await fs.promises.rm(dir, { recursive: true, force: true });
});

const lists = {
	'@thzero/alpha/openSource.js': [
		{ category: 'server', name: 'shared-lib', url: 'a' },
		{ category: 'client', name: 'client-only', url: 'a' }
	],
	'@thzero/gamma/openSource.js': [
		{ category: 'server', name: 'shared-lib', url: 'g' },
		{ category: 'server', name: 'gamma-only', url: 'g' }
	]
};

const newService = () => {
	const service = new UtilityService();
	service.warnings = [];
	service.imported = [];
	inject(service, '_logger', { debug() {}, info() {}, error() {}, exception() {}, fatal() {}, trace() {}, warn(clazz, method, message, err) { service.warnings.push(err); } });
	inject(service, '_config', { get: () => null });
	service._openSourceDir = () => dir;
	service._openSourceImport = async (importPath) => {
		service.imported.push(importPath);
		return { default: () => lists[importPath] };
	};
	return service;
};

describe('_initializeOopenSource', () => {
	// The loop used to stat each package with existsSync, import them one after
	// another, and scan the results so far for every entry to dedupe.
	it('collects the server entries, sorted by name, first package wins on a duplicate', async () => {
		const service = newService();
		await service._initializeOopenSource('cid');
		assert.deepEqual(service.imported, [ '@thzero/alpha/openSource.js', '@thzero/gamma/openSource.js' ], 'beta has no list and is not imported');
		// The list is sorted by name once collected; the url shows which package's
		// entry survived the dedupe.
		assert.deepEqual(service._openSourceResponse.results.map(e => `${e.name}:${e.url}`), [ 'gamma-only:g', 'shared-lib:a' ]);
		assert.equal(service.warnings.length, 0);
	});

	it('a package whose list fails to load is skipped and logged, the rest still collected', async () => {
		const service = newService();
		service._openSourceImport = async (importPath) => {
			if (importPath.includes('alpha'))
				throw new Error('broken');
			return { default: () => lists[importPath] };
		};
		await service._initializeOopenSource('cid');
		assert.deepEqual(service._openSourceResponse.results.map(e => `${e.name}:${e.url}`), [ 'gamma-only:g', 'shared-lib:g' ]);
		assert.equal(service.warnings.length, 1);
	});

	it('a missing directory is logged and leaves an empty list', async () => {
		const service = newService();
		service._openSourceDir = () => path.join(dir, 'nope');
		await service._initializeOopenSource('cid');
		assert.deepEqual(service._openSourceResponse.results, []);
		assert.equal(service.warnings.length, 1);
	});
});
