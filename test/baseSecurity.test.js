import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import '@thzero/library_common/utility/string.js';
import BaseSecurityService from '../service/baseSecurity.js';

const AND = BaseSecurityService.logicalAnd;
const OR = BaseSecurityService.logicalOr;

// A permission model in the shape easy-rbac produces: admin satisfies everything
// user does, plus admin itself.
const can = (subject, role) => subject === role || (subject === 'admin' && role === 'user');

class TestSecurityService extends BaseSecurityService {
	async validate(correlationId, sub, dom, obj, act) {
		this.validateCalls.push({ correlationId, sub, dom, obj, act });
		return can(sub, act ? `${obj}:${act}` : obj);
	}
}

let service;

beforeEach(() => {
	service = new TestSecurityService();
	service.validateCalls = [];
	service._logger = { debug() {}, error() {}, warn() {}, exception() {} };
});

describe('initializeOptionsLogical', () => {
	// Regression: the guard was an `||` chain of `!==` against two mutually
	// exclusive values, so it was always true and every caller got logicalOr.
	// Any route asking for "all of these roles" silently got "any of them".
	it('returns logicalAnd when asked for it', () => {
		assert.equal(service.initializeOptionsLogical('cid', { logical: AND }), AND);
	});

	it('returns logicalOr for or, unknown values and no options', () => {
		assert.equal(service.initializeOptionsLogical('cid', { logical: OR }), OR);
		assert.equal(service.initializeOptionsLogical('cid', { logical: 'nonsense' }), OR);
		assert.equal(service.initializeOptionsLogical('cid', {}), OR);
		assert.equal(service.initializeOptionsLogical('cid', null), OR);
	});
});

describe('initializeRoles', () => {
	// Regression: the result of .map(trim) was discarded, so 'a, b' stayed as
	// ['a', ' b'] and the leading space meant ' b' never matched a role.
	it('trims a comma separated string', () => {
		assert.deepEqual(service.initializeRoles('cid', [], 'admin, billing'), ['admin', 'billing']);
	});

	// Known gap: only the string path trims. An array is passed through as given,
	// so a config-supplied [' admin'] keeps its leading space. Pinning current
	// behaviour - flip this if the array path is ever normalised too.
	it('does not trim an array (known gap)', () => {
		assert.deepEqual(service.initializeRoles('cid', [], [' admin', 'user ']), [' admin', 'user ']);
	});

	// Known gap: empty entries survive, so 'a,,b' yields a role of ''.
	it('keeps empty entries (known gap)', () => {
		assert.deepEqual(service.initializeRoles('cid', [], 'a,,b'), ['a', '', 'b']);
	});

	// Known gap: the function falls off the end for anything that is neither array
	// nor string, returning undefined. This is safe today only because the fastify
	// middleware guards on `request.roles.length > 0` before using it, which denies.
	it('returns undefined for unusable input (known gap)', () => {
		assert.equal(service.initializeRoles('cid', [], { bad: true }), undefined);
		assert.equal(service.initializeRoles('cid', [], null), undefined);
	});
});

describe('authorizationCheckRoles', () => {
	const user = (...roles) => ({ roles });

	it('denies when there is no user', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', null, ['user'], OR), false);
	});

	it('or: passes when any required role is satisfied', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', user('user'), ['admin', 'user'], OR), true);
	});

	it('or: denies when none is satisfied', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', user('guest'), ['admin', 'user'], OR), false);
	});

	// Regression: the loops were nested user-roles-outer and the result accumulated
	// across the cross product, so under logicalAnd EVERY user role had to satisfy
	// EVERY required role. A user holding ['admin','user'] was denied a route
	// requiring ['admin'] as soon as 'user' failed that check.
	it('and: a user with extra roles still passes', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', user('admin', 'user'), ['admin'], AND), true);
		assert.equal(await service.authorizationCheckRoles('cid', user('admin', 'user'), ['user'], AND), true);
	});

	it('and: passes only when every required role is satisfied', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', user('admin', 'user'), ['admin', 'user'], AND), true);
		assert.equal(await service.authorizationCheckRoles('cid', user('user'), ['admin', 'user'], AND), false);
	});

	it('and: denies a user who satisfies none of them', async () => {
		assert.equal(await service.authorizationCheckRoles('cid', user('guest'), ['admin'], AND), false);
	});

	// Regression: the or path did not short circuit, so it ground through the whole
	// claims x roles cross product even after a match.
	it('short circuits on the first satisfied role', async () => {
		await service.authorizationCheckRoles('cid', user('admin', 'user', 'other'), ['admin'], OR);
		assert.equal(service.validateCalls.length, 1);
	});

	// Regression: authorizationCheckClaims called a five parameter validate with
	// four arguments, so everything shifted left and the subject arrived as null.
	it('passes the subject through to validate, not null', async () => {
		await service.authorizationCheckRoles('cid', user('admin'), ['admin'], OR);
		assert.equal(service.validateCalls[0].sub, 'admin');
		assert.equal(service.validateCalls[0].correlationId, 'cid');
	});
});

describe('authorizationCheckClaims', () => {
	it('denies when claims are missing or not an array', async () => {
		assert.equal(await service.authorizationCheckClaims('cid', null, ['user'], OR), false);
		assert.equal(await service.authorizationCheckClaims('cid', 'nope', ['user'], OR), false);
	});

	it('or: passes when any claim satisfies a required role', async () => {
		assert.equal(await service.authorizationCheckClaims('cid', ['admin'], ['admin', 'user'], OR), true);
	});

	// Same cross product defect as authorizationCheckRoles.
	it('and: a caller with extra claims still passes', async () => {
		assert.equal(await service.authorizationCheckClaims('cid', ['admin', 'user'], ['admin'], AND), true);
	});

	it('and: denies when a required role is unsatisfied', async () => {
		assert.equal(await service.authorizationCheckClaims('cid', ['user'], ['admin', 'user'], AND), false);
	});

	// Regression: the four-argument call meant the subject reached the enforcer as
	// null and nothing could ever be authorized through this path.
	it('passes the claim through as the subject', async () => {
		await service.authorizationCheckClaims('cid', ['admin'], ['admin'], OR);
		assert.equal(service.validateCalls[0].sub, 'admin');
		assert.equal(service.validateCalls[0].correlationId, 'cid');
	});
});

// The checks above run on every protected request, and each used to make four
// debug calls per required role, three inside the inner loop, with one of them
// handing the whole user object to the logger. Now they ask once.
describe('debug logging in the checks', () => {
	const user = { roles: [ 'user' ] };
	let debugs;

	beforeEach(() => {
		debugs = 0;
		service._logger = { debug() { debugs++; }, error() {}, warn() {}, exception() {}, isDebugEnabled: () => false };
	});

	it('makes no debug call when the logger says debug is off', async () => {
		await service.authorizationCheckRoles('cid', user, [ 'user' ], OR);
		await service.authorizationCheckClaims('cid', [ 'user' ], [ 'user' ], OR);
		assert.equal(debugs, 0);
	});

	it('still logs when it is on', async () => {
		service._logger.isDebugEnabled = () => true;
		await service.authorizationCheckRoles('cid', user, [ 'user' ], OR);
		assert.ok(debugs > 0);
	});

	it('logs as before through a logger without the check', async () => {
		delete service._logger.isDebugEnabled;
		await service.authorizationCheckRoles('cid', user, [ 'user' ], OR);
		assert.ok(debugs > 0);
	});

	it('never logs the result of each validate call', async () => {
		service._logger.isDebugEnabled = () => true;
		const messages = [];
		service._logger.debug = (clazz, method, message) => messages.push(message);
		await service.authorizationCheckRoles('cid', { roles: [ 'a', 'b', 'user' ] }, [ 'user' ], OR);
		assert.equal(messages.includes('result'), false);
	});
});

describe('role parsing', () => {
	it('splits obj.act into the object and the action', async () => {
		await service.authorizationCheckRoles('cid', { roles: [ 'admin' ] }, [ 'thing.read' ], OR);
		assert.equal(service.validateCalls[0].obj, 'thing');
		assert.equal(service.validateCalls[0].act, 'read');
	});

	it('leaves the action null when there is none', async () => {
		await service.authorizationCheckRoles('cid', { roles: [ 'admin' ] }, [ 'thing' ], OR);
		assert.equal(service.validateCalls[0].obj, 'thing');
		assert.equal(service.validateCalls[0].act, null);
	});

	// Roles come from route config, so the same strings arrive on every request.
	it('splits each role string once and reuses it', async () => {
		await service.authorizationCheckRoles('cid', { roles: [ 'admin' ] }, [ 'thing.read' ], OR);
		const first = service._roleParts.get('thing.read');
		await service.authorizationCheckClaims('cid', [ 'admin' ], [ 'thing.read' ], OR);
		await service.authorizationCheckRoles('cid', { roles: [ 'admin' ] }, [ 'thing.read' ], OR);
		assert.equal(service._roleParts.get('thing.read'), first);
		assert.equal(service._roleParts.size, 1);
	});
});

describe('validate', () => {
	let base;
	let asked;

	beforeEach(() => {
		base = new BaseSecurityService();
		asked = [];
		base._enforcer = { async can(sub, role) { asked.push({ sub, role }); return true; } };
	});

	it('joins dom, obj and act with colons, leaving out the absent ones', async () => {
		await base.validate('cid', 's', 'd', 'o', 'a');
		await base.validate('cid', 's', null, 'o', 'a');
		await base.validate('cid', 's', null, 'o', null);
		await base.validate('cid', 's', 'd', 'o', null);
		assert.deepEqual(asked.map(a => a.role), [ 'd:o:a', 'o:a', 'o', 'd:o' ]);
		assert.equal(asked[0].sub, 's');
	});

	it('throws without an enforcer', async () => {
		base._enforcer = null;
		await assert.rejects(() => base.validate('cid', 's', null, 'o', null), /No enforcer/);
	});
});

describe('initializeOptionsRoles', () => {
	it('returns the roles when present', () => {
		assert.deepEqual(service.initializeOptionsRoles('cid', { roles: ['a'] }), ['a']);
	});

	it('returns an empty array when absent or empty', () => {
		assert.deepEqual(service.initializeOptionsRoles('cid', {}), []);
		assert.deepEqual(service.initializeOptionsRoles('cid', { roles: [] }), []);
	});
});
