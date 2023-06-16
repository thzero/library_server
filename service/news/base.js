import LibraryServerConstants from '../../constants.js';

import Service from '../../service/index.js';

class BaseNewsService extends Service {
	constructor() {
		super();

		this._repositoryNewsI = null;

		this._serviceValidationNews = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryNewsI = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_NEWS);

		this._serviceValidationNews = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);
	}

	async latest(correlationId, user, timestamp) {
		this._enforceNotEmpty('BaseNewsService', 'latest', timestamp, 'timestamp', correlationId);
		try {
			timestamp = parseInt(timestamp);
		}
		catch (err) {
			return this._error('BaseNewsService', 'latest', 'Invalid timestamp.', null, err, null, correlationId);
		}

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
