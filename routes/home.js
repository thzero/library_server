import BaseRoute from './index';

class HomeRoute extends BaseRoute {
	constructor(prefix) {
		super(prefix ? prefix : '');
	}

	get id() {
		return 'home';
	}

	_initializeRoutes(router) {
		// eslint-disable-next-line
		router.get('/', (ctx, next) => {
			ctx.status = 404;
		});
	}

	get _version() {
		return 'v1';
	}
}

export default HomeRoute;
