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

		const healthCheckPath = this._config.get('healthcheck.path', LibraryConstants.HealthCheck.DefaultPath);
		this.registerIgnore(healthCheckPath);

		this._repositoryUsageMetricsI = this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC);
	}

	async register(context, err) {
		try {
			if (!context)
				return;

			const path = context.request.path;
			if ()

			const url = context.request.path;
			if (!String.isNullOrEmpty(url)) {
				for (const ignore of this._ignore) {
					if (url === ignore)
						return;
				}
			}

			const usageMetrics = {};
			usageMetrics.correlationId = context.correlationId;
			usageMetrics.href = context.request.href;
			usageMetrics.headers = context.request.headers;
			usageMetrics.host = context.request.host;
			usageMetrics.hostname = context.request.hostname;
			usageMetrics.querystring = context.request.querystring;
			usageMetrics.type = context.request.type;
			usageMetrics.token = context.request.token;
			usageMetrics.err = err;
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
