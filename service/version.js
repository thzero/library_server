import NotImplementedError from '../errors/notImplemented';

import Service from './index';

class VersionService extends Service {
	async version(correlationId) {
		throw new NotImplementedError();
	}
}

export default VersionService;
