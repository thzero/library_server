import LibraryServerConstants from '../../constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import BootPlugin from './index.js';

class NewsApiBootPlugin extends BootPlugin {
	async _initRoutes() {
		await super._initRoutes();

		this._initRoute(this._initRoutesNews());
	}

	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryServerConstants.InjectorKeys.REPOSITORY_NEWS, this._initRepositoriesNews());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_NEWS, this._initServicesNews());
		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_VALIDATION_NEWS, this._initServicesNewsValidation());
	}

	_initRepositoriesNews() {
		throw new NotImplementedError();
	}

	_initRoutesNews() {
		throw new NotImplementedError();
	}

	_initServicesNews() {
		throw new NotImplementedError();
	}

	_initServicesNewsValidation() {
		throw new NotImplementedError();
	}
}

export default NewsApiBootPlugin;
