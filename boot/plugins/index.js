class BootPlugin {
	async init(config, injector) {
		this._config = config;
		this._injector = injector;
	}

	async initRoutes(routes) {
		this._routes = routes;

		await this._initRoutesPre();

		await this._initRoutes();

		await this._initRoutesPost();
	}

	async initRepositories(repositories) {
		this._repositories = repositories;

		await this._initRepositories();
	}

	async initServices(services) {
		this._services = services;

		await this._initServices();
	}

	async initServicesSecondary(services) {
		this._services = services;

		await this._initServicesSecondary();
	}

	_initRoute(route) {
		this._routes.push(route);
	}

	async _initRoutes() {
	}

	async _initRoutesPost() {
	}

	async _initRoutesPre() {
	}

	async _initRepositories() {
	}

	_injectRepository(key, repository) {
		console.log(`repositories.inject - ${key}`);
		this._repositories.set(key, repository);
		this._injector.addSingleton(key, repository);
	}

	_injectService(key, service) {
		console.log(`services.inject - ${key}`);
		this._services.set(key, service);
		this._injector.addSingleton(key, service);
	}

	async _initServices() {
	}

	async _initServicesSecondary() {
	}
}

export default BootPlugin;
