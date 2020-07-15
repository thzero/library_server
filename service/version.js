import NotImplementedError from '../errors/notImplemented';

import Service from './index';

class VersionService extends Service {
	async version(correlationId) {
		throw new NotImplementedError();
	}

	_generate(version_major, version_minor, version_patch, version_date) {
		const response = this._initResponse();
		response.results = {
			major: version_major,
			minor: version_minor,
			patch: version_patch,
			date: version_date
		};
		return response;
	}
}

export default VersionService;
