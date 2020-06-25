import LibraryConstants from '../constants';

class Repository {
	init(injector) {
		this._injector = injector;
	}

	get _config() {
		return this._injector.getService(LibraryConstants.InjectorKeys.CONFIG)
	}

	get _logger() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	}
}

export default Repository;
