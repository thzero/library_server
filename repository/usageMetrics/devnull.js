import Repository from '../index';

class DevNullUsageMetricsRepository extends Repository {
	async register(usageMetrics) {
		const correlationId = usageMetrics ? usageMetrics.correlationId : null;
		// Do nothing here.
		return this._success(correlationId);
	}
}

export default DevNullUsageMetricsRepository;
