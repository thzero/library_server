import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import usersRoute from '../../routes/users';

class UsersApiBootPlugin extends BootPlugin {
	async _initRoutes() {
		await super._initRoutes();

		const usersRoute = this._initRoutesUsers();
		if (!usersRoute)
			this._initRoute(usersRoute);
	}

	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USERS, this._initRepositoriesUsers());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_AUTH, this._initServicesAuth());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_USERS, this._initServicesUser());
	}

	_initRepositoriesUsers() {
		throw new NotImplementedError();
	}

	_initRoutesUsers() {
		return new usersRoute();
	}

	_initServicesAuth() {
		throw new NotImplementedError();
	}

	_initServicesUser() {
		throw new NotImplementedError();
	}
}

export default UsersApiBootPlugin;
