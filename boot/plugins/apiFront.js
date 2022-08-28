import LibraryConstants from '../../constants.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import ApiBootPlugin from './api.js';

import utilityService from '../../service/utility.js';

class FrontApiBootPlugin extends ApiBootPlugin {
	async _initRoutesPre() {
		super._initRoutesPre();

		this._initRoute(this._initRoutesUtility());
	}

	async _initServices() {
		super._initServices();

		this._injectService(LibraryConstants.InjectorKeys.SERVICE_UTILITY, this._initServicesUtility());
	}

	_initRoutesUtility() {
		throw new NotImplementedError();
	}

	_initServicesUtility() {
		return new utilityService();
	}
}

export default FrontApiBootPlugin;
