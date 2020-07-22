import LibraryConstants from '../../constants';

import NotImplementedError from '../../errors/notImplemented';

import BootPlugin from './index';

import adminNewsRoute from '../../routes/admin/news';
import adminUsersRoute from '../../routes/admin/users'

class AdminBootPlugin extends BootPlugin {
	async _initRoutes() {
		this._initRoute(this._initRoutesAdminNews());
		this._initRoute(this._initRoutesAdminUsers());
	}

	async _initRepositories() {
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_NEWS, this._initRepositoriesAdminNews());
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_USERS, this._initRepositoriesAdminUsers());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_NEWS, this._initServicesAdminNews());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_USERS, this._initServicesAdminUsers());
	}

	_initRepositoriesAdminNews() {
		throw new NotImplementedError();
	}

	_initRepositoriesAdminUsers() {
		throw new NotImplementedError();
	}

	_initRoutesAdminNews() {
		return new adminNewsRoute();
	}

	_initRoutesAdminUsers() {
		return new adminUsersRoute();
	}

	_initServicesAdminNews() {
		throw new NotImplementedError();
	}

	_initServicesAdminUsers() {
		throw new NotImplementedError();
	}
}

export default AdminBootPlugin;
