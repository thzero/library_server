import koaBody from 'koa-body';

import LibraryConstants from '../constants';

import Utility from '../utility';

import BaseRoute from './index';

import authentication from '../middleware/authentication';
// import authorization from '../middleware/authorization';

class UtilityRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/api/utility');
	}

	_initializeRoutes(router) {
		router.post('/logger',
			authentication(false),
			// authorization('utility'),
			// eslint-disable-next-line,
			koaBody({
				text: false,
			}),
			async (ctx, next) => {
				const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_UTILITY);
				const response = (await service.logger(ctx.correlationId, ctx.request.body)).check(ctx);
				ctx.body = Utility.stringify(response);
			}
		);
	}
}

export default UtilityRoute;
