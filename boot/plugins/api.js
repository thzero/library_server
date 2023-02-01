import LibraryServerConstants from '../../constants.js';
import LibraryCommonServiceConstants from '@thzero/library_common_service/constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import BootPlugin from './index.js';

import cryptoService from '../../service/crypto.js';
import versionService from '../../service/version.js';

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
			this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_COMMUNICATION_REST, communicationRestService);
		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_CRYPTO, this._initServicesCrypto());
		this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_VERSION, this._initServicesVersion());

		const validationServices = this._initServicesValidation();
		if (validationServices)
			this._injectService(LibraryCommonServiceConstants.InjectorKeys.SERVICE_VALIDATION, validationServices);
	}

	_initRoutesHome() {
		throw new NotImplementedError();
	}

	_initRoutesVersion() {
		throw new NotImplementedError();
	}

	_initServicesCrypto() {
		return new cryptoService();
	}

	_initServicesCommunicationRest() {
		return null;
	}

	_initServicesValidation() {
		return null;
	}

	_initServicesVersion() {
		return new versionService();
	}
}

export default ApiBootPlugin;
