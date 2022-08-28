import Service from '@thzero/library_common_service/service/index.js';

class ServerService extends Service {
	constructor() {
		super();
	}

	_validateUser(correlationId, user) {
		if (!user)
			return this._error('Service', '_validateUser', 'Invalid user', null, null, null, correlationId);

		if (String.isNullOrEmpty(user.id))
			return this._error('Service', '_validateUser', 'Invalid user.id', null, null, null, correlationId);

		this._logger.debug('Service', '_validateUser', 'userId', user.id, correlationId);
		return this._success(correlationId);
	}
}

export default ServerService;
