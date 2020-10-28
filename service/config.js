import Service from './index';

class ConfigService extends Service {
	constructor(config) {
		super();

		this._config = config;
	}

	get(key, defaultValue) {
		try {
			return this._config.get(key);
		}
		catch (err) {
			if (defaultValue !== undefined)
				return defaultValue;
			throw err;
		}
	}

	getBackend(key, defaultValue) {
		if (String.isNullOrEmpty(key))
			return null;

		if (!this._config)
			return null;

		const configBackend = this._config.get('backend', defaultValue);
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

export default ConfigService;
