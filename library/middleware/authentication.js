import LibraryConstants from '../constants';

import Utility from '../utility';

import injector from '../utility/injector';

const authentication = (required) => {
	return async (ctx, next) => {
		const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);

		const token = Utility.getAuthToken(ctx);
		logger.debug('authentication.token', token);
		logger.debug('authentication.required', required);
		const valid = ((required && !String.isNullOrEmpty(token)) || !required);
		logger.debug('authentication.valid', valid);
		if (valid) {
			if (!String.isNullOrEmpty(token)) {
				const service = injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
				const results = await service.verifyToken(ctx.correlationId, token);
				logger.debug('authentication.results', results);
				if (!results || !results.success) {
					logger.warn('Unauthorized... invalid token');
					ctx.throw(401);
					return;
				}

				ctx.state.token = token;
				ctx.state.user = results.user;
				ctx.state.claims = results.claims;
			}

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

		logger.warn('Unauthorized... authentication unknown');
		ctx.throw(401);
	}
}

export default authentication;
