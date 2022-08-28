import Data from './index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

class BaseNewsData extends Data {
	constructor() {
		super();

		this.article = '';
		this.gameSystemId = null;
		this.requiresAuth = false;
		this.status = this._defaultStatus();
		this.sticky = false;
		this.timestamp = null;
		this.title = '';
		this.type = this._defaultType();
	}

	map(requested) {
		if (!requested)
			return;

		this.article = requested.article;
		this.gameSystemId = requested.gameSystemId;
		this.requiresAuth = requested.requiresAuth;
		this.status = requested.status;
		this.sticky = false;
		this.timestamp = requested.timestamp;
		this.title = requested.title;
		this.type = requested.type;
	}

	_defaultStatus() {
		throw new NotImplementedError();
	}

	_defaultType() {
		throw new NotImplementedError();
	}
}

export default BaseNewsData;
