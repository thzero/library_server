import LibraryConstants from '../../constants';
import LibraryCommonServiceConstants from '@thzero/library_common_service/constants';

import BootPlugin from './index';

import homeRoute from '../../routes/home';
import versionRoute from '../../routes/version';

import cryptoService from '../../service/crypto';
import versionService from '../../service/version';

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

		const validationServices = this._initServicesValidation();
		if (validationServices)
			this._injectService(LibraryCommonServiceConstants.InjectorKeys.SERVICE_VALIDATION, validationServices);
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

	_initServicesValidation() {
		return null;
	}

	_initServicesVersion() {
		return new versionService();
	}
}

export default ApiBootPlugin;
