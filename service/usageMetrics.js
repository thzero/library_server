import LibraryServerConstants from '../constants.js';

import Service from './index.js';

class UsageMetricsService extends Service {
	constructor() {
		super();

		this._ignore = new Set();

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
			if (!String.isNullOrEmpty(url) && this._ignore.has(url))
				return;

			usageMetrics.date = new Date();

			await this._repositoryUsageMetrics.register(usageMetrics);
			return this._success(usageMetrics.correlationId);
		}
		catch (err) {
			this._logger.exception('UsageMetricsService', 'register', err);
		}
	}

	registerIgnore(url) {
		this._ignore.add(url);
	}

	async listing(correlationId, user, params) {
		// No user enforcement here: the /usageMetrics/listing route requires the admin
		// role, so access is settled before this is reached, and nothing below uses
		// user. The enforcement that used to sit here was dead - value and name were
		// transposed - and making it live 500'd the route.
		const validationResponse = this._serviceValidation.check(correlationId, this._serviceValidation.usageMetricsMeasurementTagParams, params ?? {});
		if (this._hasFailed(validationResponse))
			return validationResponse;

		return await this._repositoryUsageMetrics.listing(correlationId, params);
	}

	async tag(correlationId, user, tag) {
		// No user enforcement: the route is anonymous, and the body below handles an
		// absent user on purpose - `if (user)` and `user ? user.id : null`.
		this._enforceNotNull('UsageMetricsService', 'tag', tag, 'tag', correlationId);

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
		return this._repositoryUsageMetricsI;
	}
}

export default UsageMetricsService;
