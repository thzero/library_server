import rbac from 'easy-rbac'

import Service from './index.js';

class BaseSecurityService extends Service {
	constructor() {
		super();

		this._enforcer = null;
		// role string -> { obj, act }. Roles come from route config, so the same
		// handful of strings arrive on every request; split each once.
		this._roleParts = new Map();
	}

	async init(injector) {
		await super.init(injector);

		const model = this._initModel();
		if (!model)
			return;

		this._enforcer = new rbac(model)
	}
	
	async authorizationCheckClaims(correlationId, claims, roles, logical) {
		try {
			if (!claims)
				return false;
			if (!(claims && Array.isArray(claims)))
				return false;
			if (!roles)
				return true;

			if (String.isNullOrEmpty(logical) || (logical !== BaseSecurityService.logicalAnd && logical !== BaseSecurityService.logicalOr))
				logical = BaseSecurityService.logicalOr;

			// This runs on every protected request, with the loop below inside it.
			// Ask once whether debug is on rather than paying for each call.
			const debug = this._debugEnabled();

			// Same shape as authorizationCheckRoles: outer loop over the REQUIRED
			// roles, inner over the claims. A required role is satisfied when ANY
			// claim validates against it.
			let parts;
			let satisfied;
			for (const role of roles) {
				if (debug)
					this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'role', role, correlationId);

				parts = this._roleSplit(role);

				satisfied = false;
				for (const claim of claims) {
					if (debug)
						this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'authorization.claim', claim, correlationId);

					// validate(correlationId, sub, dom, obj, act) - five parameters.
					// This was called with four, so every argument shifted left and
					// the subject reached the enforcer as null.
					if (await this.validate(correlationId, claim, null, parts.obj, parts.act)) {
						satisfied = true;
						break;
					}
				}

				if (debug)
					this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'satisfied', satisfied, correlationId);
				// or  - any one required role is enough
				// and - every required role must be satisfied
				if (logical === BaseSecurityService.logicalOr) {
					if (satisfied)
						return true;
				}
				else if (!satisfied)
					return false;
			}

			return (logical === BaseSecurityService.logicalAnd);
		}
		catch (err) {
			this._error('BaseSecurityService', 'authorizationCheckClaims', null, err, null, null, correlationId);
			return false;
		}
	}

	async authorizationCheckRoles(correlationId, user, roles, logical) {
		try {
			if (!user)
				return false;
			if (!roles)
				return true;

			// This runs on every protected request, with the loop below inside it.
			// Ask once whether debug is on rather than paying for each call; the
			// user line in particular hands the whole user object to the logger.
			const debug = this._debugEnabled();

			if (debug)
				this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'user', user, correlationId);
			if (!(user && user.roles && Array.isArray(user.roles)))
				return false;

			if (debug)
				this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'logical', logical, correlationId);

			if (String.isNullOrEmpty(logical) || (logical !== BaseSecurityService.logicalAnd && logical !== BaseSecurityService.logicalOr))
				logical = BaseSecurityService.logicalOr;

			// The outer loop is over the REQUIRED roles, the inner over the user's.
			// A required role is satisfied when ANY of the user's roles validates
			// against it. Previously the loops were nested the other way and the
			// result accumulated across the cross product, so under logicalAnd every
			// user role had to satisfy every required role - a user holding
			// ['admin','user'] was denied a route requiring ['user'] as soon as
			// 'admin' failed that check.
			let parts;
			let satisfied;
			for (const role of roles) {
				if (debug)
					this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'role', role, correlationId);

				parts = this._roleSplit(role);

				satisfied = false;
				for (const userRole of user.roles) {
					if (debug)
						this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'userRole', userRole, correlationId);

					if (await this.validate(correlationId, userRole, null, parts.obj, parts.act)) {
						satisfied = true;
						break;
					}
				}

				if (debug)
					this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'satisfied', satisfied, correlationId);
				// or  - any one required role is enough
				// and - every required role must be satisfied
				if (logical === BaseSecurityService.logicalOr) {
					if (satisfied)
						return true;
				}
				else if (!satisfied)
					return false;
			}

			return (logical === BaseSecurityService.logicalAnd);
		}
		catch (err) {
			this._error('BaseSecurityService', 'authorizationCheckRoles', null, err, null, null, correlationId);
			return false;
		}
	}

	initializeRoles(correlationId, requestRoles, roles) {
		if (Array.isArray(roles)) {
			this._logger.debug('BaseSecurityService', 'initalizeRoles', 'roles1a', roles, correlationId);
			requestRoles = roles;
			return requestRoles;
		}
		
		if ((typeof(roles) === 'string') || (roles instanceof String)) {
			// this._logger.debug('BaseSecurityService', 'initalizeRoles', 'roles1b', roles, correlationId);
			requestRoles = roles.split(',');
			// .map does not mutate; without capturing the result 'a, b' stayed as
			// ['a', ' b'] and the leading space meant ' b' never matched a role.
			requestRoles = requestRoles.map(item => item ? item.trim() : item);
			return requestRoles;
		}
	}

	initializeOptionsLogical(correlationId, options) {
		if (!options)
			return BaseSecurityService.logicalOr;

		let logical = options.logical;
		// && , not || : logical cannot equal both values, so an || chain is always
		// true and every caller asking for logicalAnd was silently given logicalOr.
		if (String.isNullOrEmpty(logical) || ((logical !== BaseSecurityService.logicalAnd) && (logical !== BaseSecurityService.logicalOr)))
			logical = BaseSecurityService.logicalOr;

		return logical;
	}

	initializeOptionsRoles(correlationId, options) {
		let roles = [];
		if (options.roles && Array.isArray(options.roles) && (options.roles.length > 0))
			roles = options.roles;
		return roles;
	}

	async validate(correlationId, sub, dom, obj, act) {
		if (!this._enforcer)
			throw Error('No enforcer found');

		// dom:obj:act with the absent parts left out. Built as a string rather
		// than an array and join, since this is once per role per request.
		const role = (dom ? `${dom}:` : '') + (obj ?? '') + (act ? `:${act}` : '');
		return await this._enforcer.can(sub, role);
	}

	// A logger facade without the check (an older one, or a stub) logs as before.
	_debugEnabled() {
		return !this._logger.isDebugEnabled || this._logger.isDebugEnabled();
	}

	_initModel() {
		return null;
	}

	_roleSplit(role) {
		let parts = this._roleParts.get(role);
		if (parts)
			return parts;

		const split = role.split('.');
		parts = { obj: split[0], act: split.length >= 2 ? split[1] : null };
		this._roleParts.set(role, parts);
		return parts;
	}

	static logicalAnd = 'and';
	static logicalOr = 'or';
}

export default BaseSecurityService;
