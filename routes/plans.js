import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import BaseRoute from './index';

class PlansRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/api');
	}

	_initializeRoutes(router) {
		router.get('/plans',
			// eslint-disable-next-line
			async (ctx, next) => {
				const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_PLANS);
				const response = (await service.listing(ctx.correlationId)).check(ctx);
				ctx.body = Utility.stringify(response);
			}
		);
	}
}

export default PlansRoute;
