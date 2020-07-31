import LibraryConstants from '../constants';

class Repository {
	async init(injector) {
		this._injector = injector;
	}

	get _config() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_CONFIG)
	}

	get _logger() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	}
}

export default Repository;
