import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BaseUsersAdminService from '../service/admin/users.js';

const logger = { debug() {}, info() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} };

class Model {
	constructor() {
		this.id = null;
		this.roles = [];
		this.external = null;
		this.updatedTimestamp = 0;
	}

	map(source) {
		Object.assign(this, source);
	}
}

class TestUsersAdminService extends BaseUsersAdminService {
	_initializeData() {
		return new Model();
	}
}

const admin = { id: 'admin-1', external: null };

const newService = ({ fetched, updateSucceeds = true, setClaimsResults = [ true, true ] }) => {
	const service = new TestUsersAdminService();
	Object.defineProperty(service, '_logger', { value: logger, writable: true, configurable: true });
	const calls = { claims: [], updates: [] };
	let claimsCall = 0;
	service._serviceValidation = { idSchema: {}, check: (correlationId) => service._success(correlationId) };
	service._repositoryUsers = {
		fetch: async (correlationId) => fetched ? service._successResponse(fetched, correlationId) : { success: false, results: null },
		update: async (correlationId, userId, value) => {
			calls.updates.push(value);
			return updateSucceeds ? service._successResponse(value, correlationId) : service._error('Repo', 'update', 'failed', null, null, null, correlationId);
		}
	};
	service._serviceAuth = {
		setClaims: async (correlationId, uid, roles) => {
			calls.claims.push({ uid, roles });
			return setClaimsResults[claimsCall++] ? service._success(correlationId) : service._error('Auth', 'setClaims', 'failed', null, null, null, correlationId);
		}
	};
	return { service, calls };
};

const existing = () => ({ id: 'user-1', roles: [ 'user' ], external: { id: 'ext-1' }, updatedTimestamp: 10 });

describe('BaseUsersAdminService.update', () => {
	// Regression: the acting admin's external was checked, then the edited
	// user's was read; with an admin carrying no external every update failed,
	// and an edited user without one threw.
	it('checks the edited user for an external id, not the acting admin', async () => {
		const { service, calls } = newService({ fetched: existing() });
		const response = await service.update('cid', admin, 'user-1', { roles: [ 'admin' ], updatedTimestamp: 10 });
		assert.equal(service._hasSucceeded(response), true);
		assert.deepEqual(calls.claims, [ { uid: 'ext-1', roles: [ 'admin' ] } ]);
		assert.equal(calls.updates.length, 1);
	});

	it('refuses a user without an external id before writing anything', async () => {
		const { service, calls } = newService({ fetched: { ...existing(), external: null } });
		const response = await service.update('cid', admin, 'user-1', { roles: [ 'admin' ], updatedTimestamp: 10 });
		assert.equal(service._hasFailed(response), true);
		assert.equal(calls.claims.length, 0);
		assert.equal(calls.updates.length, 0);
	});

	it('reports not found for a missing user', async () => {
		const { service, calls } = newService({ fetched: null });
		const response = await service.update('cid', admin, 'user-1', { roles: [ 'admin' ], updatedTimestamp: 10 });
		assert.equal(response.message, 'Not found.');
		assert.equal(calls.claims.length, 0);
	});

	it('does not touch the record when setting the claims fails', async () => {
		const { service, calls } = newService({ fetched: existing(), setClaimsResults: [ false ] });
		const response = await service.update('cid', admin, 'user-1', { roles: [ 'admin' ], updatedTimestamp: 10 });
		assert.equal(service._hasFailed(response), true);
		assert.equal(calls.updates.length, 0);
	});

	it('puts the previous claims back when the record update fails', async () => {
		const { service, calls } = newService({ fetched: existing(), updateSucceeds: false });
		const response = await service.update('cid', admin, 'user-1', { roles: [ 'admin' ], updatedTimestamp: 10 });
		assert.equal(service._hasFailed(response), true);
		assert.deepEqual(calls.claims, [ { uid: 'ext-1', roles: [ 'admin' ] }, { uid: 'ext-1', roles: [ 'user' ] } ]);
	});
});
