import NotImplementedError from '../../errors/notImplemented';

import Service from '../index';
import Utility from '@thzero/library_server/library/utility';

class BaseAdminService extends Service {
	async create(correlationId, user, requestedValue) {
		if (!this._allowsCreate)
			return this._error();

		const validationResponse = this._validateUser(user);
		if (!validationResponse.success)
			return this._errorResponse(validationResponse);

		this._logger.debug('requestedValue', requestedValue);
		const validationCheckValueResponse = this._validateCreate(requestedValue);
		if (!validationCheckValueResponse.success)
			return this._errorResponse(validationCheckValueResponse);

		const respositoryResponse = await this._repository.create(correlationId, user.id, requestedValue);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async delete(correlationId, user, id) {
		if (!this._allowsDelete)
			return this._error();

		const validationCheckIdResponse = this._serviceValidation.check(this._serviceValidation.idSchema, id, null, this._validationCheckKey);
		if (!validationCheckIdResponse.success)
			return this._errorResponse(validationCheckIdResponse);

		const respositoryResponse = await this._repository.delete(correlationId, id);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async search(correlationId, user, params) {
		const validationCheckParamsResponse = this._validateSearch(params);
		if (!validationCheckParamsResponse.success)
			return this._errorResponse(validationCheckParamsResponse);

		const respositoryResponse = await this._repository.search(correlationId, params);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async update(correlationId, user, id, requestedValue) {
		if (!this._allowsUpdate)
			return this._error();

		const validationResponse = this._validateUser(user);
		if (!validationResponse.success)
			return this._errorResponse(validationResponse);

		const validationIdResponse = this._validateId(id, this._validationCheckKey);
		if (!validationIdResponse.success)
			return this._errorResponse(validationIdResponse);

		this._logger.debug('requestedValue', requestedValue);
		const validationCheckValueUpdateResponse = this._validateUpdate(requestedValue);
		if (!validationCheckValueUpdateResponse.success)
			return this._errorResponse(validationCheckValueUpdateResponse);

		let value = this._initializeData();
		const fetchRespositoryResponse = await this._repository.fetch(correlationId, id);
		if (fetchRespositoryResponse.success && fetchRespositoryResponse.results)
			value = Utility.map(this._initializeData(), fetchRespositoryResponse.results, true);

		const validResponse = this._checkUpdatedTimestamp(value, requestedValue, 'value');
		if (!validResponse.success)
			return validResponse;

		value.map(requestedValue);

		const respositoryResponse = await this._repository.update(correlationId, user.id, value);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
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

	_validateCreate(requestedValue) {
		return this._serviceValidation.check(this._validationCreateSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationCreateSchema() {
		throw new NotImplementedError()
	}

	_validateSearch(requestedValue) {
		if (this._validationSearchSchema === null)
			return this._success()

		return this._serviceValidation.check(this._validationSearchSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationSearchSchema() {
		return null
	}

	_validateUpdate(requestedValue) {
		return this._serviceValidation.check(this._validationUpdateSchema, requestedValue, null, this._validationCheckKey);
	}

	get _validationUpdateSchema() {
		throw new NotImplementedError()
	}

	get _validationCheckKey() {
		throw new NotImplementedError()
	}
}

export default BaseAdminService;
