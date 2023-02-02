import LibraryServerConstants from '../../../constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import AdminBootPlugin from './index.js';

class UsersAdminBootPlugin extends AdminBootPlugin {
	async _initRoutes() {
		this._initRoute(this._initRoutesAdminUsers());
	}

	async _initRepositories() {
		this._injectRepository(LibraryServerConstants.InjectorKeys.REPOSITORY_ADMIN_USERS, this._initRepositoriesAdminUsers());
	}

	async _initServices() {
		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_ADMIN_USERS, this._initServicesAdminUsers());
	}

	_initRepositoriesAdminUsers() {
		throw new NotImplementedError();
	}

	_initRoutesAdminUsers() {
		throw new NotImplementedError();
	}

	_initServicesAdminUsers() {
		throw new NotImplementedError();
	}
}

export default UsersAdminBootPlugin;
