import Data from './index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

class BaseUserData extends Data {
	constructor() {
		super();

		this.planId = null;
		this.roles = [];
		this.settings = this._initUserSettings();
		this.user = null;
	}

	map(requested) {
		if (!requested)
			return;

		this.planId = requested.planId;
		this.roles = requested.roles;
	}

	_initUserSettings() {
		throw new NotImplementedError();
	}
}

export default BaseUserData;
