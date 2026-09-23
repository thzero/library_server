import ConfigService from '@thzero/library_common_service/service/config.js';

class ServerConfigService extends ConfigService {
	constructor(config) {
		super(config);

		// lowercased key -> backend entry, built on first use.
		this._backends = null;
	}

	getBackend(correlationId, key) {
		try {
			if (String.isNullOrEmpty(key))
				return null;

			if (!this._config)
				return null;

			return this._getBackends().get(key.toLowerCase()) ?? null;
		}
		catch (err) {
			this._error('ServerConfigService', 'getBackend', null, err, null, null, correlationId);
		}

		return null;
	}

	// The backend list is static config, so it is read and indexed once. Every
	// lookup used to re-read it and lowercase every entry, and read it from the
	// raw provider rather than through get(), so with no backend configured each
	// outbound call threw, caught, and logged an error before returning null.
	_getBackends() {
		if (this._backends)
			return this._backends;

		const backends = new Map();
		const configBackend = this.get('backend', null);
		if (Array.isArray(configBackend)) {
			for (const item of configBackend) {
				if (!item || String.isNullOrEmpty(item.key))
					continue;
				const lowered = item.key.toLowerCase();
				// First entry wins, as the scan did.
				if (!backends.has(lowered))
					backends.set(lowered, item);
			}
		}

		this._backends = backends;
		return backends;
	}
}

export default ServerConfigService;
