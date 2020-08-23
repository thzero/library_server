import LibraryConstants from '../constants';

import injector from '@thzero/library_common/utility/injector';

const separator = ': ';

function getAuthToken(context) {
	if (!context)
		return null;

	const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
	const token = context.get(LibraryConstants.Headers.AuthKeys.AUTH);
	logger.debug('middleware', 'getAuthToken', 'token', token);
	const split = token.split(LibraryConstants.Headers.AuthKeys.AUTH_BEARER + separator);
	logger.debug('middleware', 'getAuthToken', 'split', split);
	logger.debug('middleware', 'getAuthToken', 'split.length', split.length);
	if (split.length > 1)
		return split[1];

	logger.debug('middleware', 'getAuthToken', 'fail');
	return null;
}

const authentication = (required) => {
	return async (ctx, next) => {
		const logger = injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);

		const token = getAuthToken(ctx);
		logger.debug('middleware', 'authentication', 'token', token);
		logger.debug('middleware', 'authentication', 'required', required);
		const valid = ((required && !String.isNullOrEmpty(token)) || !required);
		logger.debug('middleware', 'authentication', 'valid', valid);
		if (valid) {
			if (!String.isNullOrEmpty(token)) {
				const service = injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
				const results = await service.verifyToken(ctx.correlationId, token);
				logger.debug('middleware', 'authentication', 'results', results);
				if (!results || !results.success) {
					logger.warn('middleware', 'authentication', 'Unauthorized... invalid token');
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
				logger.error('middleware', 'authentication', err);
			});
		})();

		logger.warn('middleware', 'authentication', 'Unauthorized... authentication unknown');
		ctx.throw(401);
	}
}

export default authentication;
