import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import newsRoute from '../../routes/news';

class NewsApiBootPlugin extends BootPlugin {
	async _initRoutes() {
		await super._initRoutes();

		this._initRoute(this._initRoutesNews());
	}

	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_NEWS, this._initRepositoriesNews());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_NEWS, this._initServicesNews());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS, this._initServicesNewsValidation());
	}

	_initRepositoriesNews() {
		throw new NotImplementedError();
	}

	_initRoutesNews() {
		return new newsRoute();
	}

	_initServicesNews() {
		throw new NotImplementedError();
	}

	_initServicesNewsValidation() {
		throw new NotImplementedError();
	}
}

export default NewsApiBootPlugin;
