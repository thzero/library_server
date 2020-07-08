import BaseRoute from './index';

class HomeRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '/api');
	}

	_initializeRoutes(router) {
		// eslint-disable-next-line
		router.get('/', (ctx, next) => {
			ctx.status = 404;
		});
	}
}

export default HomeRoute;
