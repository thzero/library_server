import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import UsersApiBootPlugin from './users';

class ExtendedUsersApiBootPlugin extends UsersApiBootPlugin {
	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_PLANS, this._initRepositoriesPlans());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_PLANS, this._initServicesPlans());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_SECURITY, this._initServicesSecurity());
	}

	_initRepositoriesPlans() {
		throw new NotImplementedError();
	}

	_initServicesPlans() {
		throw new NotImplementedError();
	}
}

export default ExtendedUsersApiBootPlugin;
