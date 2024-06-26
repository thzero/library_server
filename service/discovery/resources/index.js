import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import DiscoveryService from '../index.js';

class ResourcesDiscoveryService extends DiscoveryService {
	async cleanup(correlationId) {
	}

	get allowsHeartbeat() {
		return true;
	}

	async cleanup(correlationId) {
		try {
			return this._cleanup(correlationId);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'cleanup', null, err, null, null, correlationId);
		}
	}

	async deregister(correlationId, name) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'deregister', name, 'name', correlationId);

			return this._deregister(correlationId);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'deregister', null, err, null, null, correlationId);
		}
	}

	async getService(correlationId, name) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'getService', name, 'name', correlationId);

			return this._getService(correlationId, name);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'getService', null, err, null, null, correlationId);
		}
	}

	// options { name, ttl, description }
	async initializeDiscovery(opts) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'initializeDiscovery', opts, 'opts', null);
			this._enforceNotEmpty('ResourceDiscoveryService', 'initializeDiscovery', opts.address, 'address', null);
			this._enforceNotNull('ResourceDiscoveryService', 'initializeDiscovery', opts.port, 'port', null);

			return await this._initializeDiscovery(opts);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'initializeDiscovery', null, err, null, null, null);
		}
	}

	async listing(correlationId) {
		return this._listing(correlationId);
	}

	// options { name, ttl, description }
	async register(correlationId, opts) {
		try {
			this._enforceNotEmpty('ResourceDiscoveryService', 'register', opts, 'opts', correlationId);
			this._enforceNotEmpty('ResourceDiscoveryService', 'register', opts.address, 'address', correlationId);
			this._enforceNotNull('ResourceDiscoveryService', 'register', opts.port, 'port', correlationId);

			return await this._register(correlationId, opts);
		}
		catch(err) {
			return this._error('ResourceDiscoveryService', 'register', null, err, null, null, correlationId);
		}
	}

	async _cleanup(correlationId) {
		throw new NotImplementedError();
	}

	async _deregister(correlationId, name) {
		throw new NotImplementedError();
	}

	async _getService(correlationId, name) {
		throw new NotImplementedError();
	}

	async _initializeDiscovery(opts) {
		throw new NotImplementedError();
	}

	async _register(correlationId, opts) {
		throw new NotImplementedError();
	}

	async _listing(correlationId) {
		throw new NotImplementedError();
	}
}

export default ResourcesDiscoveryService;
