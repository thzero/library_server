import Service from './index.js';

class HealthService extends Service {
	constructor() {
		super();
	}

	async health(correlationId) {
		this._successResponse({ check: 'Ok' }, correlationId);
	}
}

export default HealthService;
