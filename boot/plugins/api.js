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
		if (utilityRoute)
			this._initRoute(utilityRoute);
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_CRYPTO, this._initServicesCrypto());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_SECURITY, this._initServicesSecurity());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VERSION, this._initServiceVersion());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_UTILITY, this._initServicesUtility());
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

	_initServicesSecurity() {
		throw new NotImplementedError();
	}

	_initServiceVersion() {
		throw new NotImplementedError();
	}

	_initServicesUtility() {
		return new utilityService();
	}
}

export default ApiBootPlugin;
