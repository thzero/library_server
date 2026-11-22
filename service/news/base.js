import LibraryServerConstants from '../../constants.js';

import Service from '../../service/index.js';

class BaseNewsService extends Service {
	constructor() {
		super();

		this._repositoryNewsI = null;

		this._serviceValidationNews = null;

		this._latestLimit = BaseNewsService.LatestLimitDefault;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryNewsI = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_NEWS);

		this._serviceValidationNews = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);

		const limit = Number(this._config ? this._config.get('news.latestLimit', BaseNewsService.LatestLimitDefault) : BaseNewsService.LatestLimitDefault);
		this._latestLimit = Number.isInteger(limit) ? limit : BaseNewsService.LatestLimitDefault;
	}

	async latest(correlationId, user, timestamp) {
		try {
			if ((timestamp === null) || (timestamp === undefined) || (timestamp === ''))
				return this._error('BaseNewsService', 'latest', 'Invalid timestamp.', null, null, null, correlationId);

			timestamp = parseInt(timestamp, 10);
			if (Number.isNaN(timestamp))
				return this._error('BaseNewsService', 'latest', 'Invalid timestamp.', null, null, null, correlationId);

			const validationCheckNewsTiemstampResponse = this._serviceValidation.check(correlationId, this._serviceValidationNews.newsTimestampSchema, timestamp, null, 'news');
			if (!validationCheckNewsTiemstampResponse.success)
				return validationCheckNewsTiemstampResponse;
	
			const respositoryResponse = await this._repositoryNews.latest(correlationId, timestamp, {
				authenticated: !!user,
				limit: this._latestLimit > 0 ? this._latestLimit : null
			});
			if (this._hasFailed(respositoryResponse))
				return respositoryResponse;
	
			if (!respositoryResponse.results)
				respositoryResponse.results = {};

			let data = respositoryResponse.results.data;
			data = Array.isArray(data) ? data.filter(l => (l.requiresAuth && user) || !l.requiresAuth) : [];
			respositoryResponse.results.data = data;
			respositoryResponse.results.count = data.length;
	
			return respositoryResponse;
		}
		catch (err) {
			return this._error('BaseNewsService', 'latest', null, err, null, null, correlationId);
		}
	}

	get _repositoryNews() {
		return this._repositoryNewsI;
	}

	static LatestLimitDefault = 50;
}

export default BaseNewsService;
