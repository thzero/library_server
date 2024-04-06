import LibraryServerConstants from '../constants.js';

import LibraryMomentUtility from '@thzero/library_common/utility/moment.js';

import Service from './index.js';

class UsageMetricsService extends Service {
	constructor() {
		super();

		this._ignore = [];

		this._repositoryUsageMetricsI = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryUsageMetricsI = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_USAGE_METRIC);
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

			usageMetrics.date = new Date(new Date(LibraryMomentUtility.getTimestamp()).toISOString());

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

	async listing(correlationId) {
		return await this._repositoryUsageMetrics.listing(correlationId);
	}

	async tag(correlationId, user, tag) {
		this._enforceNotNull('UsageMetricsService', 'tag', 'user', user, correlationId);
		this._enforceNotNull('UsageMetricsService', 'tag', 'tag', tag, correlationId);

		if (user) {
			const validationResponsUser = this._validateUser(correlationId, user);
			if (this._hasFailed(validationResponsUser))
				return validationResponsUser;
		}
			
		const validationResponse = this._serviceValidation.check(correlationId, this._serviceValidation.usageMetricsMeasurementTag, tag);
		if (this._hasFailed(validationResponse))
			return validationResponse;
	
		return await this._repositoryUsageMetrics.tag(correlationId, user ? user.id : null, tag);
	}

	get _repositoryUsageMetrics() {
		return this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_USAGE_METRIC)
	}
}

export default UsageMetricsService;
