import LibraryConstants from '../constants';

import injector from '../utility/injector';

require('../utility/string');

const logicalAnd = 'and';
const logicalOr = 'or';

const authorizationCheckClaims = async (ctx, success, logical, security, logger) => {
	if (!ctx)
		return false;
	if (!(ctx.state.claims && Array.isArray(ctx.state.claims)))
		return false;

	let result;
	let roleAct;
	let roleObj;
	let roleParts;
	for (const claim of ctx.state.claims) {
		logger.debug('authorization.claim', claim);

		for (const role of ctx.state.roles) {
			logger.debug('authorization.role', role);

			roleParts = role.split('.');
			if (roleParts && roleParts.length < 1)
				success = false;

			roleObj = roleParts[0];
			roleAct = roleParts.length >= 2 ? roleParts[1] : null

			result = await security.validate(claim, null, roleObj, roleAct);
			logger.debug('authorization.result', result);
			if (logical === logicalOr)
				success = success || result;
			else
				success = success && result;
		}
	}

	return success;
}

const authorizationCheckRoles = async (ctx, success, logical, security, logger) => {
	if (!ctx)
		return false;

	logger.debug('authorizationCheckRoles.user', ctx.state.user);
	if (!(ctx.state.user && ctx.state.user.roles && Array.isArray(ctx.state.user.roles)))
		return false;

	logger.debug('authorization.logical', logical);

	let result;
	let roleAct;
	let roleObj;
	let roleParts;
	for (const userRole of ctx.state.user.roles) {
		logger.debug('authorization.userRole', userRole);

		for (const role of ctx.state.roles) {
			logger.debug('authorization.role', role);

			roleParts = role.split('.');
			if (roleParts && roleParts.length < 1)
				success = false;

			roleObj = roleParts[0];
			roleAct = roleParts.length >= 2 ? roleParts[1] : null

			result = await security.validate(userRole, null, roleObj, roleAct);
			logger.debug('authorization.result', result);
			if (logical === logicalOr) {
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

const initalizeRoles = (ctx, roles, logger) => {
	if (Array.isArray(roles)) {
		// logger.debug('authorization.roles1a', roles);
		ctx.state.roles = roles;
	}
	else if ((typeof(roles) === 'string') || (roles instanceof String)) {
		// logger.debug('authorization.roles1b', roles);
		ctx.state.roles = roles.split(',');
		ctx.state.roles.map(item => item ? item.trim() : item);
	}
}

const authorization = (roles, logical) => {
	if (String.isNullOrEmpty(logical) || (logical !== logicalAnd) || (logical !== logicalOr))
		logical = logicalOr;

	return async (ctx, next) => {
		const config = injector.getService(LibraryConstants.InjectorKeys.CONFIG);
		const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
		const security = injector.getService(LibraryConstants.InjectorKeys.SERVICE_SECURITY);

		// logger.debug('token', ctx.state.token);
		logger.debug('authorization.user', ctx.state.user);
		logger.debug('authorization.claims', ctx.state.claims);
		logger.debug('authorization.roles1', roles);
		ctx.state.roles = [];
		if (roles) {
			// logger.debug('authorization.roles1', roles);
			// logger.debug('authorization.roles1', (typeof roles));
			// logger.debug('authorization.roles1', Array.isArray(roles));
			// logger.debug('authorization.roles1', ((typeof(roles) === 'string') || (roles instanceof String)));
			// if (Array.isArray(roles)) {
			// 	// logger.debug('authorization.roles1a', roles);
			// 	ctx.state.roles = roles;
			// }
			// else if ((typeof(roles) === 'string') || (roles instanceof String)) {
			// 	// logger.debug('authorization.roles1b', roles);
			// 	ctx.state.roles = roles.split(',');
			// 	ctx.state.roles.map(item => item ? item.trim() : item);
			// }
			initalizeRoles(ctx, roles, logger);
		}
		logger.debug('authorization.roles2', ctx.state.roles);

		let success = false; //(logical === logicalOr ? false : true);
		if (ctx.state.roles && Array.isArray(ctx.state.roles) && (ctx.state.roles.length > 0)) {
			const auth = config.get('auth');
			if (auth) {
				logger.debug('authorization.auth.claims', auth.claims);
				logger.debug('authorization.auth.claims.check', auth.claims.check);
			}
			if (auth && auth.claims && auth.claims.check)
				success = await authorizationCheckClaims(ctx, (logical === logicalOr ? false : true), logical, security, logger);

			if (!success)
				success = await authorizationCheckRoles(ctx, (logical === logicalOr ? false : true), logical, security, logger);
		}

		logger.debug('authorization.success', ctx.state.success);
		if (success) {
			await next();
			return;
		}

		(async () => {
			const usageMetrics = injector.getService(LibraryConstants.InjectorKeys.SERVICE_USAGE_METRIC);
			await usageMetrics.register(ctx).catch((err) => {
				const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
				logger.error(null, err);
			});
		})();

		logger.warn('Unauthorized... authorization unknown');
		ctx.throw(401);
	}
}

export default authorization;
