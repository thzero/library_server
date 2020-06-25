import koaRouter from '@koa/router';

class BaseRoute {
	constructor(prefix) {
		if (!prefix)
			throw Error('Invalid prefix');

		this._prefix = prefix;
	}

	get router() {
		return this._router;
	}

	init(injector) {
		this._injector = injector;

		this._router = new koaRouter({
			prefix: this._prefix
		});

		this._initializeRoutes(this._router);

		return this._router;
	}

	_initializeRoutes(router) {
	}
}

export default BaseRoute;
