import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import '@thzero/library_common/utility/string.js';
import LibraryCommonServiceConstants from '@thzero/library_common_service/constants.js';
import VersionService from '../service/version.js';

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

// Service.init resolves the logger and config from the injector, so the fake
// has to hand back the ones the test injected or init would null them.
const newInjector = (service) => ({
	getService: (key) => {
		if (key === LibraryCommonServiceConstants.InjectorKeys.SERVICE_LOGGER)
			return service._logger;
		if (key === LibraryCommonServiceConstants.InjectorKeys.SERVICE_CONFIG)
			return service._config;
		return null;
	}
});

let dir;

before(async () => {
	dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'version-'));
	await fs.promises.writeFile(path.join(dir, 'package.json'), JSON.stringify({ version_major: 1, version_minor: 2, version_patch: 3, version_date: '2026-01-02' }));
});

after(async () => {
	await fs.promises.rm(dir, { recursive: true, force: true });
});

const newService = (file) => {
	const service = new VersionService();
	service.warnings = [];
	inject(service, '_logger', { debug() {}, info() {}, error() {}, exception() {}, fatal() {}, trace() {}, warn(clazz, method, message, err) { service.warnings.push(err); } });
	inject(service, '_config', { get: () => null });
	service._packagePath = () => file;
	return service;
};

describe('version', () => {
	// package.json used to be read synchronously on the first request.
	it('is read once, during init, and served from memory after', async () => {
		const file = path.join(dir, 'package.json');
		const service = newService(file);
		await service.init(newInjector(service));
		assert.deepEqual(service._versionResults, { major: 1, minor: 2, patch: 3, date: '2026-01-02' });

		// Make the file unreadable for the rest of the test; nothing should go
		// back to it.
		service._packagePath = () => path.join(dir, 'gone.json');
		const first = await service.version('cid');
		const second = await service.version('cid');
		assert.equal(service._hasSucceeded(first), true);
		assert.deepEqual(first.results, { major: 1, minor: 2, patch: 3, date: '2026-01-02' });
		assert.equal(second.results, first.results);
	});

	it('still loads on demand when init was not run', async () => {
		const service = newService(path.join(dir, 'package.json'));
		const response = await service.version('cid');
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(response.results.major, 1);
	});

	it('logs a missing file at init and reports it per call, rather than failing the boot', async () => {
		const service = newService(path.join(dir, 'missing.json'));
		await service.init(newInjector(service));
		assert.equal(service.warnings.length, 1);
		const response = await service.version('cid');
		assert.equal(service._hasFailed(response), true);
	});
});
