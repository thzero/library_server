import ConfigService from '@thzero/library_common_service/service/config.js';

class ServerConfigService extends ConfigService {
	constructor(config) {
		super(config);
	}

	getBackend(key) {
		try {
			if (String.isNullOrEmpty(key))
				return null;
	
			if (!this._config)
				return null;
	
			const configBackend = this._config.get('backend', null);
			if (!configBackend)
				return null;
	
			if (!Array.isArray(configBackend))
				return null;
	
			key = key.toLowerCase();
			for (const item of configBackend) {
				if (item.key.toLowerCase() === key)
					return item;
			}
	
			return null;
		}
		catch (err) {
			return this._error('ServerConfigService', 'getBackend', null, err, null, null, correlationId);
		}
	}
}

export default ServerConfigService;
