import BaseMonitoringService from '@thzero/library_common_service/service/monitoring.js';

class NullMonitoringService extends BaseMonitoringService {
	constructor() {
		super();
	}

	async init(injector) {
		await super.init(injector);
	}
}

export default NullMonitoringService;