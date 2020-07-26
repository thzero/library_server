import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import BaseRoute from './index';

class VersionRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/api');
	}

	_initializeRoutes(router) {
		router.get('/version',
			// eslint-disable-next-line
			async (ctx, next) => {
				const service = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VERSION);
				const response = (await service.version(ctx.correlationId)).check(ctx);
				ctx.body = Utility.stringify(response);
			}
		);
	}
}

export default VersionRoute;
