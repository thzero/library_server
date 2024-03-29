class BaseRoute {
	constructor(prefix) {
		if (prefix === null || prefix === undefined)
			throw Error('Invalid prefix');

		this.app = null;
		this._prefix = prefix;
	}

	get id() {
		return null;
	}

	get router() {
		return this._router;
	}

	async init(injector, app, config) {
		if (!injector)
			throw Error('Invalid injector for route.');
		if (!config)
			throw Error('Invalid config for route.');
		if (this._prefix === null || this._prefix === undefined)
			throw Error('Invalid prefix for route.');

		this.app = app;
		this._injector = injector;

		const api = config.get('api', { });
		let prefix = '';
		if (!this._ignoreApi) {
			prefix = api.prefix !== null && api.prefix !== undefined ? api.prefix : 'api';
			if (!String.isNullOrEmpty(prefix) && (prefix !== '/'))
				prefix = '/' + prefix;
		}
		
		let version = !String.isNullOrEmpty(api.version) ? api.version : null;
		if (this._version !== null && this._version !== undefined)
			version = this._version;
		if (!String.isNullOrEmpty(this.id) && api.apis && Array.isArray(api.apis))
			version = api.apis[this.id];

		if (!String.isNullOrEmpty(version))
			prefix += '/' + version;

		if (!String.isNullOrEmpty(this._prefix) && (this._prefix[0] !== '/'))
			this._prefix = '/' + this._prefix;

		this._prefix = prefix + this._prefix;

		this._router = this._initializeRouter(app, config);
		if (this._router === null || this._router === undefined)
			throw Error('Invalid router.');

		this._initializeRoutes(this._router);

		return this._router;
	}

	_initializeRouter(app, config) {
		return null;
	}

	_initializeRoutes(router) {
	}

	get _ignoreApi() {
		return false;
	}

	get _version() {
		return null;
	}
}

export default BaseRoute;
