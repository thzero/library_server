import Service from './index';

class ConfigService extends Service {
	constructor(config) {
		super();

		this._config = config;
	}

	get(key) {
		return this._config.get(key);
	}

	getBackend(key) {
		if (String.isNullOrEmpty(key))
			return null;

		if (!this._config)
			return null;

		const configBackend = this._config['backend'];
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
