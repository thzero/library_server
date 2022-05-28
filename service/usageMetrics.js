import LibraryConstants from '../constants';

import Service from './index';

class UsageMetricsService extends Service {
	constructor() {
		super();

		this._ignore = [];

		this._repositoryUsageMetricsI = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryUsageMetricsI = this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC);
	}

	async register(usageMetrics, err) {
		try {
			if (!usageMetrics)
				return;

			const url = usageMetrics.url;
			if (!String.isNullOrEmpty(url)) {
				for (const ignore of this._ignore) {
					if (url === ignore)
						return;
				}
			}

			usageMetrics.date = new Date(new Date(Utilities.getTimestamp()).toISOString());

			await this._repositoryUsageMetrics.register(usageMetrics);
			return this._success(usageMetrics.correlationId);
		}
		catch (err) {
			this._logger.exception('UsageMetricsService', 'register', err);
		}
	}

	registerIgnore(url) {
		if (this._ignore[url])
			return;

		this._ignore.push(url);
	}

	get _repositoryUsageMetrics() {
		return this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC)
	}
}

export default UsageMetricsService;
