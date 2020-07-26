import LibraryConstants from '../../constants';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BootPlugin from './index';

import homeRoute from '../../routes/home';
import utilityRoute from '../../routes/utility';
import versionRoute from '../../routes/version';

class ApiBaseBootPlugin extends BootPlugin {
	async _initRoutesPost() {
		this._initRoute(this._initRoutesHome());
	}

	async _initRoutesPre() {
		this._initRoute(this._initRoutesVersion());
	}

	async _initServices() {
		this._injectService(LibraryConstants.InjectorKeys.SERVICE_VERSION, this._initServiceVersion());
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

	_initServiceVersion() {
		throw new NotImplementedError();
	}
}

export default ApiBaseBootPlugin;
