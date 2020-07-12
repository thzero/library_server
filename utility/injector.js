class Injector {
	constructor() {
		this._di = {};
	}

	addService(key, dependency) {
		if (String.isNullOrEmpty(key))
			throw Error('Invalid injector key.');
		if (!dependency)
			throw Error('Invalid injector dependency.');

		if (this._di[key])
			return;

		this._di[key] = { dependency: dependency };
	}

	addSingleton(key, dependency) {
		if (String.isNullOrEmpty(key))
			throw Error('Invalid injector key.');
		if (!dependency)
			throw Error('Invalid injector dependency.');

		if (this._di[key])
			return;

		this._di[key] = { key: key, singleton: true, dependency: dependency };
	}

	getInjector() {
		return this._di;
	}

	getService(key, args) {
		if (String.isNullOrEmpty(key))
			throw Error('Invalid injector key.');

		const result = this._di[key];
		if (!result)
			return null;

		if (result.singleton)
			return result.dependency;

		return new result.dependency.prototype.constructor(args);
	}

	getServices() {
		return this._di.values();
	}

	getSingletons() {
		return this._di.values().filter(l => l.singleton).map(l => l.dependency);
	}
}

const singletonInstance = new Injector();
Object.freeze(singletonInstance);
export default singletonInstance;
