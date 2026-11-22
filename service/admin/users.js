import LibraryCommonUtility from '@thzero/library_common/utility/index.js';

import LibraryServerConstants from '../../constants.js';

import BaseAdminService from './index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

class BaseUsersAdminService extends BaseAdminService {
	constructor() {
		super();

		this._repositoryUsers = null;

		this._serviceAuth = null;
		this._serviceUser = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryUsers = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_ADMIN_USERS);

		this._serviceAuth = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_AUTH);
		this._serviceUser = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_USERS);
	}

	async delete(correlationId, user, id) {
		if (!this._allowsDelete)
			return this._error('BaseUsersAdminService', 'delete', null, null, null, null, correlationId);

		const validationCheckIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.idSchema, id, null, this._validationCheckKey);
		if (this._hasFailed(validationCheckIdResponse))
			return validationCheckIdResponse;

		const fetchResponse = await this._serviceUser.fetch(correlationId, id);
		if (this._hasFailed(fetchResponse))
			return fetchResponse;

		const response = await this._serviceAuth.deleteUser(correlationId, id);
		if (this._hasFailed(response))
			return response;

		const respositoryResponse = await this._repository.delete(correlationId, id);
		if (this._hasFailed(respositoryResponse))
			this._logger.error('BaseUsersAdminService', 'delete', `Auth user '${id}' was deleted but the user record was not; run the delete again to remove it.`, respositoryResponse, correlationId);
		return respositoryResponse;
	}

	async update(correlationId, user, id, requestedUser) {
		if (!this._allowsUpdate)
			return this._error('BaseUsersAdminService', 'update', null, null, null, null, correlationId);

		const validationResponse = this._validateUser(correlationId, user);
		if (this._hasFailed(validationResponse))
			return validationResponse;

		const validationIdResponse = this._validateId(correlationId, id, 'adminUsers');
		if (this._hasFailed(validationIdResponse))
			return validationIdResponse;

		this._logger.debug('BaseUsersAdminService', 'update', 'requestedUser', requestedUser, correlationId);
		const validationCheckUsersUpdateResponse = this._serviceValidation.check(correlationId, this._serviceValidation.userUpdateSchema, requestedUser, null, this._validationCheckKey);
		if (this._hasFailed(validationCheckUsersUpdateResponse))
			return validationCheckUsersUpdateResponse;

		const fetchRespositoryResponse = await this._repository.fetch(correlationId, id);
		const fetchFailedResponse = this._fetchFailed('BaseUsersAdminService', fetchRespositoryResponse, correlationId);
		if (fetchFailedResponse)
			return fetchFailedResponse;

		const userExisting = LibraryCommonUtility.map(this._initializeData(), fetchRespositoryResponse.results, true);

		if (!userExisting.external || !userExisting.external.id)
			return this._error('BaseUsersAdminService', 'update', 'User has no external id.', null, null, null, correlationId);

		const validResponse = this._checkUpdatedTimestamp(correlationId, userExisting, requestedUser, 'users');
		if (this._hasFailed(validResponse))
			return validResponse;

		const rolesPrevious = Array.isArray(userExisting.roles) ? [ ...userExisting.roles ] : [];

		userExisting.map(requestedUser);

		const serviceAdminResponse = await this._serviceAuth.setClaims(correlationId, userExisting.external.id, requestedUser.roles, true);
		if (this._hasFailed(serviceAdminResponse))
			return serviceAdminResponse;

		const respositoryResponse = await this._repository.update(correlationId, user.id, userExisting);
		if (this._hasFailed(respositoryResponse)) {
			const rollbackResponse = await this._serviceAuth.setClaims(correlationId, userExisting.external.id, rolesPrevious, true);
			if (this._hasFailed(rollbackResponse))
				this._logger.error('BaseUsersAdminService', 'update', `User '${id}' record update failed and the claims could not be restored; claims and record now disagree.`, rollbackResponse, correlationId);
			return respositoryResponse;
		}

		return respositoryResponse;
	}

	get _allowsCreate() {
		return false
	}

	get _allowsDelete() {
		return true
	}

	get _allowsUpdate() {
		return true
	}

	_initializeData() {
		throw new NotImplementedError();
	}

	get _repository() {
		return this._repositoryUsers;
	}

	get _validationCheckKey() {
		return 'adminUsers';
	}
}

export default BaseUsersAdminService;
