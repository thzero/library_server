import LibraryConstants from '../../constants';

import Service from '../../service/index';

class BaseNewsService extends Service {
	constructor() {
		super();

		this._repositoryNewsI = null;

		this._serviceValidationNews = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryNewsI = this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_NEWS);

		this._serviceValidationNews = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);
	}

	async latest(correlationId, user, timestamp) {
		this._logger.debug('BaseNewsService', 'latest', 'date', timestamp, correlationId);
		if (!timestamp)
			return this._error('BaseNewsService', 'latest', 'Invalid timestamp.', null, null, null, correlationId);

		const validationCheckNewsTiemstampResponse = this._serviceValidation.check(correlationId, this._serviceValidationNews.newsTimestampSchema, timestamp, null, 'news');
		if (!validationCheckNewsTiemstampResponse.success)
			return validationCheckNewsTiemstampResponse;

		const respositoryResponse = await this._repositoryNews.latest(correlationId, timestamp);
		if (this._hasFailed(respositoryResponse))
			return respositoryResponse;

		let data = respositoryResponse.results.data;
		if (data)
			data = data.filter(l => (l.requiresAuth && user) || !l.requiresAuth);
		respositoryResponse.results.data = data;
		respositoryResponse.results.count = data.length;

		return respositoryResponse;
	}

	get _repositoryNews() {
		return this._repositoryNewsI;
	}
}

export default BaseNewsService;
