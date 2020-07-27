import LibraryConstants from '../constants';

import injector from '@thzero/library_common/utility/injector';

const separator = ': ';

function getAuthToken(context) {
	if (!context)
		return null;

	const token = context.get(LibraryConstants.Headers.AuthKeys.AUTH);
	logger.debug('getAuthToken.token', token);
	const split = token.split(LibraryConstants.Headers.AuthKeys.AUTH_BEARER + separator);
	logger.debug('getAuthToken.split', split);
	logger.debug('getAuthToken.split.length', split.length);
	if (split.length > 1)
		return split[1];

	logger.debug('getAuthToken.fail');
	return null;
}

const authentication = (required) => {
	return async (ctx, next) => {
		const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);

		const token = getAuthToken(ctx);
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
