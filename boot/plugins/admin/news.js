import LibraryConstants from '../../../constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import AdminBootPlugin from './index.js';

class NewsAdminBootPlugin extends AdminBootPlugin {
	async _initRoutes() {
		this._initRoute(this._initRoutesAdminNews());
	}

	async _initRepositories() {
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_NEWS, this._initRepositoriesAdminNews());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_NEWS, this._initServicesAdminNews());
	}

	_initRepositoriesAdminNews() {
		throw new NotImplementedError();
	}

	_initRoutesAdminNews() {
		throw new NotImplementedError();;
	}

	_initServicesAdminNews() {
		throw new NotImplementedError();
	}
}

export default NewsAdminBootPlugin;
