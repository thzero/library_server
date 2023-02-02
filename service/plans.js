import LibraryServerConstants from '../constants.js';

import Service from './index.js';

class PlansService extends Service {
	constructor() {
		super();

		this._repositoryPlansI = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryPlansI = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_PLANS);
	}

	async listing(correlationId) {
		const respositoryResponse = await this._repositoryPlans.listing(correlationId);
		return respositoryResponse;
	}

	get _repositoryPlans() {
		return this._repositoryPlansI;
	}
}

export default PlansService;