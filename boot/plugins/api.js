import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import homeRoute from '../../routes/home';
import utilityRoute from '../../routes/utility';
import versionRoute from '../../routes/version';

import cryptoService from '../../service/crypto';
import utilityService from '../../service/utility';

class ApiBootPlugin extends BootPlugin {
	async _initRoutesPost() {
		this._initRoute(this._initRoutesHome());
	}

	async _initRoutesPre() {
		const utilityRoute = this._initRoutesUtility();
		const utilityService = this._initServicesUtility();
		if (utilityRoute || utilityService)
			this._initRoute(utilityRoute);
		this._initRoute(this._initRoutesVersion());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_CRYPTO, this._initServicesCrypto());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VERSION, this._initServicesVersion());

		const utilityRoute = this._initRoutesUtility();
		const utilityService = this._initServicesUtility();
		if (utilityRoute || utilityService)
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_UTILITY, utilityService);
	}

	_initRoutesHome() {
		return new homeRoute();
	}

	_initRoutesUtility() {
		return new utilityRoute();
	}

	_initRoutesVersion() {
		return new versionRoute();
	}

	_initServicesCrypto() {
		return new cryptoService();
	}

	_initServicesVersion() {
		throw new NotImplementedError();
	}

	_initServicesUtility() {
		return new utilityService();
	}
}

export default ApiBootPlugin;
