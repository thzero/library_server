import koaRouter from '@koa/router';

class BaseRoute {
	constructor(prefix) {
		if (prefix === null || prefix === undefined)
			throw Error('Invalid prefix');

		this._prefix = prefix;
	}

	get id() {
		return null;
	}

	get router() {
		return this._router;
	}

	async init(injector, config) {
		if (!injector)
			throw Error('Invalid injector for route.');
		if (!config)
			throw Error('Invalid injector for route.');
		if (this._prefix === null || this._prefix === undefined)
			throw Error('Invalid prefix for route.');

		this._injector = injector;

		const api = config.get('api', { });
		let prefix = api.prefix !== null && api.prefix !== undefined ? api.prefix : 'api';
		
		let version = !String.isNullOrEmpty(api.version) ? api.version : null;
		if (!String.isNullOrEmpty(this._version))
			version = this._version;
		if (!String.isNullOrEmpty(this.id) && api.apis && Array.isArray(api.apis))
			version = api.apis[this.id];

		if (!String.isNullOrEmpty(version))
			prefix += '/' + version;

		if (!String.isNullOrEmpty(this._prefix) && (this._prefix[0] !== '/'))
			this._prefix = '/' + this._prefix;

		this._prefix = prefix + this._prefix;

		this._router = new koaRouter({
			prefix: this._prefix
		});

		this._initializeRoutes(this._router);

		return this._router;
	}

	_initializeRoutes(router) {
	}

	get _version() {
		return null;
	}
}

export default BaseRoute;
