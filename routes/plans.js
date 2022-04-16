import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import BaseRoute from './index';

class PlansRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/plans');

		// this._servicePlans = null;
	}

	async init(injector, config) {
		const router = await super.init(injector, config);
		router.servicePlans = injector.getService(LibraryConstants.InjectorKeys.SERVICE_PLANS);
		// this._servicePlans = injector.getService(LibraryConstants.InjectorKeys.SERVICE_PLANS);
	}

	get id() {
		return 'plans';
	}

	_initializeRoutes(router) {
		router.get('/',
			// eslint-disable-next-line
			async (ctx, next) => {
				const response = (await router.servicePlans.listing(ctx.correlationId)).check(ctx);
				this._jsonResponse(ctx, Utility.stringify(response));
			}
		);
	}

	get _version() {
		return 'v1';
	}
}

export default PlansRoute;
