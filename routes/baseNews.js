import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import BaseRoute from './index';

import authentication from '../middleware/authentication';

class BaseNewsRoute extends BaseRoute {
	constructor(prefix, version) {
		super(prefix ? prefix : '/news');
	}

	get id() {
		return 'news';
	}

	_initializeRoutes(router) {
		router.get('/latest/:date',
			authentication(false),
			// eslint-disable-next-line
			async (ctx, next) => {
				const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_NEWS);
				const response = (await service.latest(ctx.correlationId, ctx.state.user, parseInt(ctx.params.date))).check(ctx);
				ctx.body = Utility.stringify(response);
			}
		);
	}
}

export default BaseNewsRoute;
