import LibraryConstants from '../constants';
import LibraryCommonConstants from '@thzero/library_common/constants';

import injector from '@thzero/library_common/utility/injector';

const separator = ': ';

function getAuthToken(context) {
	if (!context)
		return null;

	const logger = injector.getService(LibraryCommonConstants.InjectorKeys.SERVICE_LOGGER);
	const token = context.get(LibraryConstants.Headers.AuthKeys.AUTH);
	logger.debug('middleware', 'getAuthToken', 'token', token, context.correlationId);
	const split = token.split(LibraryConstants.Headers.AuthKeys.AUTH_BEARER + separator);
	logger.debug('middleware', 'getAuthToken', 'split', split, context.correlationId);
	logger.debug('middleware', 'getAuthToken', 'split.length', split.length, context.correlationId);
	if (split.length > 1)
		return split[1];

	logger.debug('middleware', 'getAuthToken', 'fail', null, context.correlationId);
	return null;
}

const authentication = (required) => {
	return async (ctx, next) => {
		const logger = injector.getService(LibraryCommonConstants.InjectorKeys.SERVICE_LOGGER);

		const token = getAuthToken(ctx);
		logger.debug('middleware', 'authentication', 'token', token, ctx.correlationId);
		logger.debug('middleware', 'authentication', 'required', required, ctx.correlationId);
		const valid = ((required && !String.isNullOrEmpty(token)) || !required);
		logger.debug('middleware', 'authentication', 'valid', valid, ctx.correlationId);
		if (valid) {
			if (!String.isNullOrEmpty(token)) {
				const service = injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
				const results = await service.verifyToken(ctx.correlationId, token);
				logger.debug('middleware', 'authentication', 'results', results, ctx.correlationId);
				if (!results || !results.success) {
					logger.warn('middleware', 'authentication', 'Unauthorized... invalid token', null, ctx.correlationId);
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
				const logger = injector.getService(LibraryCommonConstants.InjectorKeys.SERVICE_LOGGER);
				logger.error('middleware', 'authentication', err, null, ctx.correlationId);
			});
		})();

		logger.warn('middleware', 'authentication', 'Unauthorized... authentication unknown', null, ctx.correlationId);
		ctx.throw(401);
	}
}

export default authentication;
