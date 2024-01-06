import LibraryConstants from '../constants.js';

import Service from './index.js';

class ExternalService extends Service {
	constructor() {
		super();

		this._serviceCommunicationRest = null;
	}

	async init(injector) {
		await super.init(injector);

		this._serviceCommunicationRest = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_COMMUNICATION_REST);
	}
}

export default ExternalService;
