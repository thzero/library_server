import LibraryConstants from '../constants';

class Repository {
	async init(injector) {
		this._injector = injector;
	}

	get _config() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_CONFIG)
	}

	get _logger() {
		return this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_LOGGER)
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
