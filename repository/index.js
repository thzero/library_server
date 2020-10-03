import LibraryConstants from '../constants';

import Response from '@thzero/library_common/response';
import ExtractResponse from '@thzero/library_common/response/extract';

class Repository {
	async init(injector) {
		this._injector = injector;
	}

	get _config() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_CONFIG)
	}

	_enforceNotEmpty(clazz, method, value, name, correlationId) {
		if (String.isNullOrEmpty(value)) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			const error = Error(`Invalid ${name}`, true);
			error.correlationId = correlationId;
			return error;
		}
	}

	_enforceNotNull(clazz, method, value, name, correlationId) {
		if (!value) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			const error = Error(`Invalid ${name}`, true);
			error.correlationId = correlationId;
			return error;
		}
	}

	_enforceNotEmptyResponse(clazz, method, value, name, correlationId) {
		if (String.isNullOrEmpty(value)) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			return Response.error(`Invalid ${name}`, null, null, null, correlationId);
		}

		return this._success(correlationId);
	}

	_enforceNotNullResponse(clazz, method, value, name, correlationId) {
		if (!value) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			return Response.error(`Invalid ${name}`, null, null, null, correlationId);
		}

		return this._success(correlationId);
	}

	_enforceNotEmptyAsResponse(clazz, method, value, name, correlationId) {
		if (String.isNullOrEmpty(value)) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			return Response.error(`Invalid ${name}`, null, null, null, correlationId);
		}

		return this._successResponse(null, correlationId);
	}

	_enforceNotNullAsResponse(clazz, method, value, name, correlationId) {
		if (!value) {
			this._logger.error(clazz, method, `Invalid ${name}`, null, correlationId);
			return Response.error(`Invalid ${name}`, null, null, null, correlationId);
		}

		return this._successResponse(null, correlationId);
	}

	_enforceResponse(response) {
		if (!response && !response.success)
			throw response;

		return response;
	}

	_error(clazz, method, message, err, code, errors, correlationId) {
		if (message)
			this._logger.error(clazz, method, message, null, correlationId);
		if (err)
			this._logger.error(clazz, method, err.message, null, correlationId);
		if (code)
			this._logger.error(clazz, method, 'code', code, correlationId);
		if (errors)
			this._logger.error(clazz, method, null, errors, correlationId);
		return Response.error(message, err, code, errors, correlationId);
	}

	_initResponse(correlationId) {
		return new Response(correlationId);
	}

	_initResponseExtract(correlationId) {
		return new ExtractResponse(correlationId);
	}

	get _logger() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	}

	_success(correlationId) {
		return Response.success(correlationId);
	}

	_successResponse(value, correlationId) {
		const response = Response.success(correlationId);
		response.results = value;
		return response;
	}

	_warn(clazz, method, message, err, code, errors, correlationId) {
		if (message)
			this._logger.warn(clazz, method, message, null, correlationId);
		if (err)
			this._logger.warn(clazz, method, err.message, null, correlationId);
		if (code)
			this._logger.warn(clazz, method, 'code', code, correlationId);
		if (errors)
			this._logger.warn(clazz, method, null, errors, correlationId);
		return Response.error(message, err, code, errors, correlationId);
	}
}

export default Repository;
