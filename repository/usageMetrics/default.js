import Repository from './index';

class DefaultUsageMetricsRepository extends Repository {
	async register(usageMetrics) {
        // Do nothing here.
		return this._success(correlationId);
	}
}

export default DefaultUsageMetricsRepository;
