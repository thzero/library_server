import Repository from '../index';

class DevNullUsageMetricsRepository extends Repository {
	async register(usageMetrics) {
        // Do nothing here.
		return this._success(correlationId);
	}
}

export default DevNullUsageMetricsRepository;
