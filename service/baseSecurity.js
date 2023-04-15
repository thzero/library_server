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
		if (!claims)
			return false;
		if (!(claims && Array.isArray(claims)))
			return false;
		if (!roles)
			return true;

		if (String.isNullOrEmpty(logical) || (logical !== BaseSecurityService.logicalAnd) || (logical !== BaseSecurityService.logicalOr))
			logical = BaseSecurityService.logicalOr;

		let success = (logical === BaseSecurityService.logicalOr ? false : true);

		let result;
		let roleAct;
		let roleObj;
		let roleParts;
		for (const claim of claims) {
			this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'authorization.claim', claim, correlationId);

			for (const role of roles) {
				this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'role', role, correlationId);

				roleParts = role.split('.');
				if (roleParts && roleParts.length < 1)
					success = false;

				roleObj = roleParts[0];
				roleAct = roleParts.length >= 2 ? roleParts[1] : null

				result = await this.validate(claim, null, roleObj, roleAct);
				this._logger.debug('BaseSecurityService', 'authorizationCheckClaims', 'result', result, correlationId);
				if (logical === BaseSecurityService.logicalOr)
					success = success || result;
				else
					success = success && result;
			}
		}

		return success;
	}

	async authorizationCheckRoles(correlationId, user, roles, logical) {
		if (!user)
			return false;
		if (!roles)
			return true;

		this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'user', user, correlationId);
		if (!(user && user.roles && Array.isArray(user.roles)))
			return false;

		this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'logical', logical, correlationId);

		if (String.isNullOrEmpty(logical) || (logical !== BaseSecurityService.logicalAnd) || (logical !== BaseSecurityService.logicalOr))
			logical = BaseSecurityService.logicalOr;

		let success = (logical === BaseSecurityService.logicalOr ? false : true);

		let result;
		let roleAct;
		let roleObj;
		let roleParts;
		for (const userRole of user.roles) {
			this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'userRole', userRole, correlationId);

			for (const role of roles) {
				this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'role', role, correlationId);

				roleParts = role.split('.');
				if (roleParts && roleParts.length < 1)
					success = false;

				roleObj = roleParts[0];
				roleAct = roleParts.length >= 2 ? roleParts[1] : null

				result = await this.validate(userRole, null, roleObj, roleAct);
				this._logger.debug('BaseSecurityService', 'authorizationCheckRoles', 'result', result, correlationId);
				if (logical === BaseSecurityService.logicalOr) {
					if (result)
						return result;

					success = false;
				}
				else
					success = success && result;
			}
		}

		return success;
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
			requestRoles.map(item => item ? item.trim() : item);
			return requestRoles;
		}
	}

	initializeOptionsLogical(correlationId, options) {
		if (!options)
			return logicalOr;

		let logical = options.logical;
		if (String.isNullOrEmpty(logical) || (logical !== logicalAnd) || (logical !== logicalOr))
			logical = logicalOr;

		return logical;
	}

	initializeOptionsRoles(correlationId, options) {
		let roles = [];
		if (options.roles && Array.isArray(options.roles) && (options.roles.length > 0))
			roles = options.roles;
		return roles;
	}

	// eslint-disable-next-line
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
		const results = await this._enforcer.can(sub, role);
		return results;
	}

	_initModel() {
		return null;
	}

	static logicalAnd = 'and';
	static logicalOr = 'or';
}

export default BaseSecurityService;
