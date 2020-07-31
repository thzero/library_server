import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import homeRoute from '../../routes/home';
import versionRoute from '../../routes/version';

import cryptoService from '../../service/crypto';

class ApiBootPlugin extends BootPlugin {
	async _initRoutesPost() {
		this._initRoute(this._initRoutesHome());
	}

	async _initRoutesPre() {
		this._initRoute(this._initRoutesVersion());
	}

	async _initServices() {
		const communicationRestService = this._initServicesCommunicationRest();
		if (communicationRestService)
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_COMMUNICATION_REST, communicationRestService);
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_CRYPTO, this._initServicesCrypto());
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VERSION, this._initServicesVersion());
	}

	_initRoutesHome() {
		return new homeRoute();
	}

	_initRoutesVersion() {
		return new versionRoute();
	}

	_initServicesCrypto() {
		return new cryptoService();
	}

	_initServicesCommunicationRest() {
		return null;
	}

	_initServicesVersion() {
		throw new NotImplementedError();
	}
}

export default ApiBootPlugin;
