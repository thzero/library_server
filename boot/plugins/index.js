class BootPlugin {
	initRoutes(routes) {
		this._routes = routes;

		this._initRoutes();
	}

	initRepositories(injector, repositories) {
		this._injector = injector;
		this._repositories = repositories;

		this._initRepositories();
	}

	initServices(injector, services) {
		this._injector = injector;
		this._services = services;

		this._initServices();
	}

	_initRoute(route) {
		this._routes.push(route);
	}

	_initRoutes() {
	}

	_initRepositories() {
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

	_initServices() {
	}
}

export default BootPlugin;
