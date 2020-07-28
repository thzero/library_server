import LibraryConstants from '../../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from '../index';

import adminUsersRoute from '../../../routes/admin/users'

class UsersAdminBootPlugin extends BootPlugin {
	async _initRoutes() {
		this._initRoute(this._initRoutesAdminUsers());
	}

	async _initRepositories() {
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_USERS, this._initRepositoriesAdminUsers());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_USERS, this._initServicesAdminUsers());
	}

	_initRepositoriesAdminUsers() {
		throw new NotImplementedError();
	}

	_initRoutesAdminUsers() {
		return new adminUsersRoute();
	}

	_initServicesAdminUsers() {
		throw new NotImplementedError();
	}
}

export default UsersAdminBootPlugin;
