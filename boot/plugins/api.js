import LibraryConstants from '../../constants';

import NotImplementedError from '../../errors/notImplemented';

import ApiBaseBootPlugin from './baseApi';

import newsRoute from '../../routes/news';
import usersRoute from '../../routes/users';
import utilityRoute from '../../routes/utility';

import cryptoService from '../../service/crypto';
import plansService from '../../service/plans';
import utilityService from '../../service/utility';

class ApiBootPlugin extends ApiBaseBootPlugin {
	async _initRoutes() {
		await super._initRoutes();

		this._initRoute(this._initRoutesNews());
		this._initRoute(this._initRoutesUsers());
		this._initRoute(this._initRoutesUtility());
	}

	async _initRepositories() {
		await super._initRepositories();

		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_NEWS, this._initRepositoriesNews());
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_PLANS, this._initRepositoriesPlans());
		this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USERS, this._initRepositoriesUsers());
	}

	async _initServices() {
		await super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_AUTH, this._initServicesAuth());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_CRYPTO, this._initServiceCrypto());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_NEWS, this._initServicesNews());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_PLANS, this._initServicesPlans());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS, this._initServicesNewsValidation());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_SECURITY, this._initServicesSecurity());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_USERS, this._initServicesUser());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_UTILITY, this._initServicesUtility());
	}

	_initRepositoriesNews() {
		throw new NotImplementedError();
	}

	_initRepositoriesPlans() {
		throw new NotImplementedError();
	}

	_initRepositoriesUsers() {
		throw new NotImplementedError();
	}

	_initRoutesNews() {
		return new newsRoute();
	}

	_initRoutesUsers() {
		return new usersRoute();
	}

	_initRoutesUtility() {
		return new utilityRoute();
	}

	_initServicesAuth() {
		throw new NotImplementedError();
	}

	_initServiceCrypto() {
		return new cryptoService();
	}

	_initServicesNews() {
		throw new NotImplementedError();
	}

	_initServicesPlans() {
		return new plansService();
	}

	_initServicesNewsValidation() {
		throw new NotImplementedError();
	}

	_initServicesSecurity() {
		throw new NotImplementedError();
	}

	_initServicesUser() {
		throw new NotImplementedError();
	}

	_initServicesUtility() {
		return new utilityService();
	}
}

export default ApiBootPlugin;
