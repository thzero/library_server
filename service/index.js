import LibraryConstants from '../constants';
import LibraryCommonConstants from '@thzero/library_common/constants';

import Response from '@thzero/library_common/response';

class Service {
	async init(injector) {
		this._injector = injector;

		this._config = this._injector.getService(LibraryConstants.InjectorKeys.CONFIG);
		this._logger = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER);
		this._serviceValidation = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION);
	}

	_checkUpdatedTimestamp(value, requestedValue, objectType) {
		if (!value && !requestedValue)
			return this._initResponse();
		if (!value)
			return this._initResponse();
		if (!requestedValue)
			return this._initResponse();

		let valid = value.updatedTimestamp >= requestedValue.updatedTimestamp;
		this._logger.debug('_checkUpdatedTimestamp.valid', valid);
		if (!valid)
			return this._error().addGeneric('Object already changed', LibraryCommonConstants.ErrorFields.ObjectChanged, { objectType: this._initResponse().paramIl8n(objectType) });

		// valid = value.updatedTimestamp === requestedValue.updatedTimestamp;
		// this._logger.debug('_checkUpdatedTimestamp.valid', valid);
		// if (!valid)
		// 	return this._error().addGeneric('Object already changed', LibraryCommonConstants.ErrorFields.ObjectChanged, { objectType: this._initResponse().paramIl8n(objectType) });

		return this._initResponse();
	}

	_enforceNotNull(value, name) {
		if (!value)
			throw Error(`Invalid ${name}`);
	}

	_enforceNotNullResponse(value, name) {
		if (!value)
			return Response.error(`Invalid ${name}`, null);

		return this._success();
	}

	_enforceNotNullAsResponse(value, name) {
		if (!value)
			return Response.error(`Invalid ${name}`, null);

		const response = this._initResponse();
		response.results = value;
		return response;
	}

	_enforceResponse(response, name) {
		if (!response && !response.success)
			throw response;

		return response;
	}

	_error(message, err, code, errors) {
		if (message)
			this._logger.error(message);
		if (err)
			this._logger.error(err.message);
		if (code)
			this._logger.error(code);
		if (errors)
			this._logger.error(errors);
		return Response.error(message, err, code, errors);
	}

	_errorResponse(response) {
		if (!response)
			return Response.error();

		return Response.error(response.message, response.err, response.code, response.errors);
	}

	_initResponse(response) {
		if (response)
			return response;
		return new Response();
	}

	_success() {
		return Response.success();
	}

	_successResponse(value) {
		let response = Response.success();
		response.results = value;
		return response;
	}

	_validateId(id, prefix) {
		if (String.isNullOrEmpty(id))
			return this._error('Invalid id');

		return this._serviceValidation.check(this._serviceValidation.idSchema, id, null, prefix);
	}

	_validateUser(user) {
		if (!user)
			return this._error('Invalid user');

		if (String.isNullOrEmpty(user.id))
			return this._error('Invalid user.id');

		this._logger.debug('userId', user.id);
		return this._success();
	}

	_warn(message, err, code, errors) {
		if (!message)
			this._logger.warn(message);
		if (!err)
			this._logger.warn(err);
		if (!code)
			this._logger.warn(code);
		if (!errors)
			this._logger.warn(errors);
		return Response.error(message, err, code, errors);
	}
}

export default Service;
