import LibraryCommonUtility from '@thzero/library_common/utility/index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import Service from '../index.js';

class BaseAdminService extends Service {
	async create(correlationId, user, requestedValue) {
		if (!this._allowsCreate)
			return this._error('BaseAdminService', 'create', null, null, null, null, correlationId);

		const validationResponse = this._validateUser(correlationId, user);
		if (this._hasFailed(validationResponse))
			return validationResponse;

		this._logger.debug('BaseAdminService', 'create', 'requestedValue', requestedValue, correlationId);
		const validationCheckValueResponse = this._validateCreate(correlationId, requestedValue);
		if (this._hasFailed(validationCheckValueResponse))
			return validationCheckValueResponse;

		const respositoryResponse = await this._repository.create(correlationId, user.id, requestedValue);
		return respositoryResponse;
	}

	async delete(correlationId, user, id) {
		if (!this._allowsDelete)
			return this._error('BaseAdminService', 'delete', null, null, null, null, correlationId);

		const validationCheckIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.idSchema, id, null, this._validationCheckKey);
		if (this._hasFailed(validationCheckIdResponse))
			return validationCheckIdResponse;

		const respositoryResponse = await this._repository.delete(correlationId, id);
		return respositoryResponse;
	}

	async search(correlationId, user, params) {
		const validationCheckParamsResponse = this._validateSearch(correlationId, params);
		if (this._hasFailed(validationCheckParamsResponse))
			return validationCheckParamsResponse;

		const respositoryResponse = await this._repository.search(correlationId, params);
		return respositoryResponse;
	}

	async update(correlationId, user, id, requestedValue) {
		if (!this._allowsUpdate)
			return this._error('BaseAdminService', 'update', 'requestedValue', null, null, null, correlationId);

		const validationResponse = this._validateUser(correlationId, user);
		if (this._hasFailed(validationResponse))
			return validationResponse;

		const validationIdResponse = this._validateId(correlationId, id, this._validationCheckKey);
		if (this._hasFailed(validationIdResponse))
			return validationIdResponse;

		this._logger.debug('BaseAdminService', 'update', 'requestedValue', requestedValue, correlationId);
		const validationCheckValueUpdateResponse = this._validateUpdate(correlationId, requestedValue);
		if (this._hasFailed(validationCheckValueUpdateResponse))
			return validationCheckValueUpdateResponse;

		let value = this._initializeData();
		const fetchRespositoryResponse = await this._repository.fetch(correlationId, id);
		if (this._hasSucceeded(fetchRespositoryResponse) && fetchRespositoryResponse.results)
			value = LibraryCommonUtility.map(this._initializeData(), fetchRespositoryResponse.results, true);

		const validResponse = this._checkUpdatedTimestamp(correlationId, value, requestedValue, 'value');
		if (this._hasFailed(validResponse))
			return validResponse;

		value.map(requestedValue);

		const respositoryResponse = await this._repository.update(correlationId, user.id, value);
		return respositoryResponse;
	}

	get _allowsCreate() {
		return true
	}

	get _allowsDelete() {
		return true
	}

	get _allowsUpdate() {
		return true
	}

	_initializeData() {
		throw new NotImplementedError()
	}

	get _repository() {
		throw new NotImplementedError()
	}

	_validateCreate(correlationId, requestedValue) {
		return this._serviceValidation.check(correlationId, this._validationCreateSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationCreateSchema() {
		throw new NotImplementedError()
	}

	_validateSearch(correlationId, requestedValue) {
		if (this._validationSearchSchema === null)
			return this._success(correlationId)

		return this._serviceValidation.check(correlationId, this._validationSearchSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationSearchSchema() {
		return null
	}

	_validateUpdate(correlationId, requestedValue) {
		return this._serviceValidation.check(correlationId, this._validationUpdateSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationUpdateSchema() {
		throw new NotImplementedError()
	}

	get _validationCheckKey() {
		throw new NotImplementedError()
	}
}

export default BaseAdminService;
