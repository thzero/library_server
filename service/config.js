import ConfigService from '@thzero/library_common_service/config';

class ServerConfigService extends ConfigService {
	constructor(config) {
		super(config);
	}

	getBackend(key) {
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
}

export default ServerConfigService;
