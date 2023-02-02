import LibraryServerConstants from '../../constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import UsersApiBootPlugin from './users.js';

import plansService from '../../service/plans.js';

class ExtendedUsersApiBootPlugin extends UsersApiBootPlugin {
	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryServerConstants.InjectorKeys.REPOSITORY_PLANS, this._initRepositoriesPlans());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_PLANS, this._initServicesPlans());
		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_SECURITY, this._initServicesSecurity());
	}

	_initRepositoriesPlans() {
		throw new NotImplementedError();
	}

	_initServicesPlans() {
		return new plansService();
	}
}

export default ExtendedUsersApiBootPlugin;
