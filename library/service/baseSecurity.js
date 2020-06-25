import rbac from 'easy-rbac'

import Service from './index';

class BaseSecurityService extends Service {
	constructor() {
		super();

		this._enforcer = null;
	}

	init(injector) {
		super.init(injector);

		const model = this._initModel();
		this._enforcer = new rbac(model)
	}

	// eslint-disable-next-line
	async validate(sub, dom, obj, act) {
		if (!this._enforcer)
			throw Error('No enforcer found')

		const array = []
		if (dom)
			array.push(dom)
		array.push(obj)
		if (act)
			array.push(act)

		const role = array.join(':')
		const results = await this._enforcer.can(sub, role)
		return results
	}

	_initModel() {
		return null;
	}
}

export default BaseSecurityService;
