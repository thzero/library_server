import LibraryConstants from '../constants';

import Service from './index';

class PlansService extends Service {
	constructor() {
		super();

		this._repositoryPlansI = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryPlansI = this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_PLANS);
	}

	async listing(correlationId) {
		const respositoryResponse = await this._repositoryPlans.listing(correlationId);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return respositoryResponse;
	}

	get _repositoryPlans() {
		return this._repositoryPlansI;
	}
}

export default PlansService;