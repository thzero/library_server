import LibraryConstants from '../constants';

import Service from './index';

class PlansService extends Service {
	async listing(correlationId) {
		const respositoryResponse = await this._repositoryPlans.listing(correlationId);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	get _repositoryPlans() {
		return this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_PLANS);
	}
}

export default PlansService;