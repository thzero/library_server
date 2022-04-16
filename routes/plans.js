import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import BaseRoute from './index';

class PlansRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/plans');
	}

	get id() {
		return 'plans';
	}

	_initializeRoutes(router) {
		router.get('/',
			// eslint-disable-next-line
			async (ctx, next) => {
				const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_PLANS);
				const response = (await service.listing(ctx.correlationId)).check(ctx);
				this._jsonResponse(ctx, Utility.stringify(response));
			}
		);
	}

	get _version() {
		return 'v1';
	}
}

export default PlansRoute;
