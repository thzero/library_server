import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BaseAdminService from '../service/admin/index.js';

const inject = (target, name, value) => {
	Object.defineProperty(target, name, { value, writable: true, configurable: true });
	return target;
};

// The smallest thing LibraryCommonUtility.map and _checkUpdatedTimestamp can
// work with: a map() that copies fields on, and a timestamp.
class Model {
	constructor() {
		this.id = null;
		this.updatedTimestamp = 0;
	}

	map(source) {
		Object.assign(this, source);
	}
}

class TestAdminService extends BaseAdminService {
	constructor(fetched) {
		super();
		this.initialized = 0;
		this.updates = [];
		this.fetched = fetched;
	}

	_initializeData() {
		this.initialized++;
		return new Model();
	}

	get _repository() {
		return {
			fetch: async (correlationId) => ({ success: this.fetched !== null, results: this.fetched, correlationId }),
			update: async (correlationId, userId, value) => { this.updates.push(value); return this._successResponse(value, correlationId); }
		};
	}

	get _validationCheckKey() { return 'thing'; }
	get _validationUpdateSchema() { return {}; }
}

const user = { id: 'admin-1' };

let service;

const newService = (fetched) => {
	const instance = new TestAdminService(fetched);
	inject(instance, '_logger', { debug() {}, info() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} });
	inject(instance, '_config', { get: () => null });
	instance._serviceValidation = { idSchema: {}, check: (correlationId) => instance._success(correlationId) };
	return instance;
};

describe('update', () => {
	// Regression: the model was built up front and, whenever the fetch succeeded,
	// thrown away for a second one mapped from the fetched document.
	it('builds one model, mapped from the fetched document', async () => {
		service = newService({ id: 'thing-1', name: 'before', updatedTimestamp: 10 });
		const response = await service.update('cid', user, 'thing-1', { name: 'after', updatedTimestamp: 10 });
		assert.equal(service._hasSucceeded(response), true);
		assert.equal(service.initialized, 1);
		assert.equal(service.updates.length, 1);
		assert.equal(service.updates[0].id, 'thing-1');
		assert.equal(service.updates[0].name, 'after');
	});

	it('builds one model when there is nothing fetched', async () => {
		service = newService(null);
		await service.update('cid', user, 'thing-1', { name: 'after', updatedTimestamp: 0 });
		assert.equal(service.initialized, 1);
	});

	// The timestamp check as it stands: a request is refused when its
	// updatedTimestamp is ahead of the stored one.
	it('refuses an update whose timestamp is ahead of the stored document, before writing', async () => {
		service = newService({ id: 'thing-1', name: 'before', updatedTimestamp: 10 });
		const response = await service.update('cid', user, 'thing-1', { name: 'after', updatedTimestamp: 20 });
		assert.equal(service._hasFailed(response), true);
		assert.equal(service.updates.length, 0);
	});
});

beforeEach(() => {
	service = null;
});
