import rbac from 'easy-rbac'

import Service from './index.js';

class BaseSecurityService extends Service {
	constructor() {
		super();

		this._enforcer = null;
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

			// Same shape as authorizationCheckRoles: outer loop over the REQUIRED
			// roles, inner over the claims. A required role is satisfied when ANY
			// claim validates against it.
			let result;
			let roleAct;
			let roleObj;
			let roleParts;
			let satisfied;
			for (const role of roles) {
				this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'role', role, correlationId);

				roleParts = role.split('.');
				roleObj = roleParts[0];
				roleAct = roleParts.length >= 2 ? roleParts[1] : null

				satisfied = false;
				for (const claim of claims) {
					this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'authorization.claim', claim, correlationId);

					// validate(correlationId, sub, dom, obj, act) - five parameters.
					// This was called with four, so every argument shifted left and
					// the subject reached the enforcer as null.
					result = await this.validate(correlationId, claim, null, roleObj, roleAct);
					this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'result', result, correlationId);
					if (result) {
						satisfied = true;
						break;
					}
				}

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

			this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'user', user, correlationId);
			if (!(user && user.roles && Array.isArray(user.roles)))
				return false;

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
			let result;
			let roleAct;
			let roleObj;
			let roleParts;
			let satisfied;
			for (const role of roles) {
				this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'role', role, correlationId);

				roleParts = role.split('.');
				roleObj = roleParts[0];
				roleAct = roleParts.length >= 2 ? roleParts[1] : null

				satisfied = false;
				for (const userRole of user.roles) {
					this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'userRole', userRole, correlationId);

					result = await this.validate(correlationId, userRole, null, roleObj, roleAct);
					this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'result', result, correlationId);
					if (result) {
						satisfied = true;
						break;
					}
				}

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

		const array = [];
		if (dom)
			array.push(dom);
		array.push(obj)
		if (act)
			array.push(act);

		const role = array.join(':');
		return await this._enforcer.can(sub, role);
	}

	_initModel() {
		return null;
	}

	static logicalAnd = 'and';
	static logicalOr = 'or';
}

export default BaseSecurityService;
