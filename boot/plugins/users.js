import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import usersRoute from '../../routes/users';

import plansService from '../../service/plans';

class UsersApiBootPlugin extends BootPlugin {
	async _initRoutes() {
		await super._initRoutes();

		this._initRoute(this._initRoutesUsers());
	}

	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_PLANS, this._initRepositoriesPlans());
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USERS, this._initRepositoriesUsers());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_AUTH, this._initServicesAuth());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_PLANS, this._initServicesPlans());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_USERS, this._initServicesUser());
	}

	_initRepositoriesPlans() {
		throw new NotImplementedError();
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

	_initServicesPlans() {
		return new plansService();
	}

	_initServicesUser() {
		throw new NotImplementedError();
	}
}

export default UsersApiBootPlugin;
