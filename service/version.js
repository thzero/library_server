import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import Service from './index';

class VersionService extends Service {
	async version(correlationId) {
		throw new NotImplementedError();
	}

	_generate(correlationId, version_major, version_minor, version_patch, version_date) {
		const response = this._success(correlationId);
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
