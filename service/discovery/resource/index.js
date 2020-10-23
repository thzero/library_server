import NotImplementedError from '@thzero/library_common/errors/notImplemented';

import BaseService from '@thzero/library_server/service/index';

class ResourceDiscoveryService extends BaseService {
	async cleanup() {
	}

	async getService(correlationId, name) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'getService', address, 'address', correlationId);

			return this._getService(name);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'getService', null, err, null, null, correlationId);
		}
	}

	// options { name, ttl, description }
	async initialize(correlationId, address, port, opts) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'initialize', address, 'address', correlationId);
			this._enforceNotNull('ResourceDiscoveryService', 'initialize', port, 'port', correlationId);

			return await this._initialize(correlationId, address, port, opts);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'initialize', null, err, null, null, correlationId);
		}
	}

	async listing(correlationId) {
		return this._listing(correlationId);
	}

	async _getService(correlationId, name) {
		throw new NotImplementedError();
	}

	async _initialize(correlationId, address, port, opts) {
		throw new NotImplementedError();
	}

	async _listing(correlationId) {
		throw new NotImplementedError();
	}
}

export default ResourceDiscoveryService;
