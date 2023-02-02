import LibraryServerConstants from '../constants.js';

import ExternalService from './external.js';

class RestExternalService extends ExternalService {
	constructor() {
		super();

		this._serviceCommunicationRest = null;
	}

	async init(injector) {
		await super.init(injector);

		this._serviceCommunicationRest = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_COMMUNICATION_REST);
	}
}

export default RestExternalService;
