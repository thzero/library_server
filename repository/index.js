import LibraryConstants from '../constants';

import Response from '@thzero/library_common/response';

class Repository {
	async init(injector) {
		this._injector = injector;
	}

	get _config() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_CONFIG)
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

	_initResponse() {
		return new Response();
	}

	_initResponseExtract() {
		return new ExtractResponse();
	}

	get _logger() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
	}

	_success() {
		return this._initResponse();
	}

	_successResponse(value) {
		let response = Response.success();
		response.results = value;
		return response;
	}
}

export default Repository;
