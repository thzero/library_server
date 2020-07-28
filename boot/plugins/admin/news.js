import LibraryConstants from '../../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import AdminBootPlugin from './index';

import adminNewsRoute from '../../../routes/admin/news';

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
		return new adminNewsRoute();
	}

	_initServicesAdminNews() {
		throw new NotImplementedError();
	}
}

export default NewsAdminBootPlugin;
