import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BaseUserService from '../service/baseUser.js';

const logger = { debug() {}, info() {}, warn() {}, error() {}, exception() {}, fatal() {}, trace() {} };

const record = () => ({
	id: 'u1',
	email: 'a@b.com',
	roles: [ 'user', 'admin' ],
	claims: [ 'admin' ],
	gamerId: 'g1',
	settings: { gamerTag: 'tag1', theme: 'dark' },
	external: { id: 'u1', name: 'Someone', picture: 'http://pic', email: 'a@b.com' },
	plan: { id: 'free' }
});

class TestUserService extends BaseUserService {
	constructor() {
		super();
		this.calls = [];
	}

	get _repositoryUser() {
		const calls = this.calls;
		const success = (results) => this._successResponse(results, 'cid');
		return {
			fetchByExternalId: async () => success(record()),
			fetchByGamerId: async () => success(record()),
			fetchByGamerTag: async () => success(record()),
			refreshSettings: async (correlationId, userId) => { calls.push([ 'refreshSettings', userId ]); return success({}); },
			updateSettings: async (correlationId, userId) => { calls.push([ 'updateSettings', userId ]); return success({}); },
			updateFromExternal: async (correlationId, id) => { calls.push([ 'updateFromExternal', id ]); return success({ id }); }
		};
	}

	_initiateUser() { return { roles: [] }; }
	_getDefaultPlan() { return 'free'; }
	_getDefaultUserRole() { return 'user'; }
}

const newService = () => {
	const service = new TestUserService();
	Object.defineProperty(service, '_logger', { value: logger, writable: true, configurable: true });
	service._serviceValidation = {
		check: (correlationId) => service._success(correlationId),
		settingRequestSchema: () => ({})
	};
	return service;
};

const owner = { id: 'u1', external: { id: 'u1' } };
const other = { id: 'u2', external: { id: 'u2' } };

describe('BaseUserService, route methods', () => {
	// Regression: the routes passed the body straight through, so any signed-in
	// user could name another user's id.
	for (const [ method, body, repoCall ] of [
		[ 'updateSettingsForUser', { userId: 'u1', settings: {} }, 'updateSettings' ],
		[ 'refreshSettingsForUser', { userId: 'u1' }, 'refreshSettings' ],
		[ 'updateForUser', { id: 'u1' }, 'updateFromExternal' ]
	]) {
		it(`${method} acts on the signed-in user's own record`, async () => {
			const service = newService();
			const response = await service[method]('cid', owner, body);
			assert.equal(service._hasSucceeded(response), true);
			assert.deepEqual(service.calls.map(c => c[0]), [ repoCall ]);
		});

		it(`${method} refuses another user's record`, async () => {
			const service = newService();
			const response = await service[method]('cid', other, body);
			assert.equal(service._hasFailed(response), true);
			assert.equal(service.calls.length, 0);
		});

		it(`${method} refuses an anonymous caller`, async () => {
			const service = newService();
			const response = await service[method]('cid', null, body);
			assert.equal(service._hasFailed(response), true);
			assert.equal(service.calls.length, 0);
		});
	}

	// Regression: an anonymous lookup returned the whole document, email and
	// roles included.
	for (const method of [ 'fetchByExternalIdForUser', 'fetchByGamerIdForUser', 'fetchByGamerTagForUser' ]) {
		it(`${method} gives anyone but the owner the public fields only`, async () => {
			const service = newService();
			for (const user of [ null, other ]) {
				const response = await service[method]('cid', user, 'x');
				assert.deepEqual(response.results, {
					id: 'u1',
					gamerId: 'g1',
					settings: { gamerTag: 'tag1' },
					external: { name: 'Someone', picture: 'http://pic' }
				});
			}
		});

		it(`${method} gives the owner the whole record`, async () => {
			const service = newService();
			const response = await service[method]('cid', owner, 'x');
			assert.equal(response.results.email, 'a@b.com');
			assert.deepEqual(response.results.roles, [ 'user', 'admin' ]);
		});
	}
});
