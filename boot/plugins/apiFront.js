import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import ApiBootPlugin from './api';

import utilityRoute from '../../routes/utility';

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

	_initServicesVersion() {
		throw new NotImplementedError();
	}
}

export default FrontApiBootPlugin;
