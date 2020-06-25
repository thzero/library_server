import Constants from '../../constants';

import Service from './index';

class VersionService extends Service {
	async version(correlationId) {
		const response = this._initResponse();
		response.results = Constants.Version;
		return response;
	}
}

export default VersionService;
