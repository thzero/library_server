import LibraryConstants from '../../constants';

import ApiBootPlugin from './api';

import utilityRoute from '../../routes/utility';

import utilityService from '../../service/utility';

class FrontApiBootPlugin extends ApiBootPlugin {
	async _initRoutesPre() {
		this._initRoute(this._initRoutesUtility());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_UTILITY, this._initServicesUtility());
	}

	_initRoutesUtility() {
		return new utilityRoute();
	}

	_initServicesUtility() {
		return new utilityService();
	}
}

export default FrontApiBootPlugin;
