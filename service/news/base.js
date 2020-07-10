import LibraryConstants from '../../constants';

import Service from '../../service/index';

class BaseNewsService extends Service {
	constructor() {
		super();

		this._serviceValidationNews = null;
	}

	async init(injector) {
		await super.init(injector);

		this._serviceValidationNews = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);
	}

	async latest(correlationId, user, timestamp) {
		this._logger.debug('date', timestamp);
		if (!timestamp)
			return this._error('Invalid timestamp.');

		const validationCheckNewsTiemstampResponse = this._serviceValidation.check(this._serviceValidationNews.newsTimestampSchema, timestamp, null, 'news');
		if (!validationCheckNewsTiemstampResponse.success)
			return this._errorResponse(validationCheckNewsTiemstampResponse);

		const respositoryResponse = await this._repositoryNews.latest(correlationId, timestamp);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		let data = respositoryResponse.results.data;
		if (data)
			data = data.filter(l => (l.requiresAuth && user) || !l.requiresAuth);
		respositoryResponse.results.data = data;
		respositoryResponse.results.count = data.length;

		return this._initResponse(respositoryResponse);
	}

	get _repositoryNews() {
		return this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_NEWS);
	}
}

export default BaseNewsService;
