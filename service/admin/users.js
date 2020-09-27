import LibraryConstants from '../../constants';

import BaseAdminService from './index';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

class BaseUsersAdminService extends BaseAdminService {
	constructor() {
		super();

		this._repositoryUsers = null;

		this._serviceAuth = null;
		this._serviceUser = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryUsers = this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_USERS);

		this._serviceAuth = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_AUTH);
		this._serviceUser = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_USERS);
	}

	async delete(correlationId, user, id) {
		if (!this._allowsDelete)
			return this._error('BaseUsersAdminService', 'delete', null, null, null, null, correlationId);

		const validationCheckIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.idSchema, id, null, this._validationCheckKey);
		if (!validationCheckIdResponse.success)
			return this._errorResponse(validationCheckIdResponse);

		const fetchResponse = await this._serviceUser.fetch(correlationId, id);
		if (!fetchResponse.success)
			return this._errorResponse(fetchResponse);

		const response = await this._serviceAuth.deleteUser(id);
		if (!response.success)
			return this._errorResponse(response);

		const respositoryResponse = await this._repository.delete(correlationId, id);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return respositoryResponse;
	}

	async update(correlationId, user, id, requestedUser) {
		const validationResponse = this._validateUser(correlationId, user);
		if (!validationResponse.success)
			return this._errorResponse(validationResponse);

		const validationIdResponse = this._validateId(correlationId, id, 'adminUsers');
		if (!validationIdResponse.success)
			return this._errorResponse(validationIdResponse);

		this._logger.debug('BaseUsersAdminService', 'update', 'requestedUser', requestedUser, correlationId);
		const validationCheckUsersUpdateResponse = this._serviceValidation.check(correlationId, this._serviceValidation.userUpdateSchema, requestedUser, null, this._validationCheckKey);
		if (!validationCheckUsersUpdateResponse.success)
			return this._errorResponse(validationCheckUsersUpdateResponse);

		let userExisting = this._initializeData();
		const fetchRespositoryResponse = await this._repository.fetch(correlationId, id);
		if (fetchRespositoryResponse.success && fetchRespositoryResponse.results)
			userExisting = Utility.map(this._initializeData(), fetchRespositoryResponse.results, true);

		const validResponse = this._checkUpdatedTimestamp(correlationId, userExisting, requestedUser, 'users');
		if (!validResponse.success)
			return validResponse;

		userExisting.map(requestedUser);

		const respositoryResponse = await this._repository.update(correlationId, user.id, userExisting);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		if (!user.external && !user.external.id)
			return this._error('BaseUsersAdminService', 'update', null, null, null, null, correlationId);

		const serviceAdminResponse = await this._serviceAuth.setClaims(userExisting.external.id, requestedUser.roles, true)
		if (!serviceAdminResponse.success)
			return this._errorResponse(serviceAdminResponse);

		return respositoryResponse;
	}

	get _allowsCreate() {
		return false
	}

	get _allowsDelete() {
		return true
	}

	get _allowsUpdate() {
		return false
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
