import Service from './index';

class UtilityService extends Service {
	async logger(content, correlationId) {
		if (!content)
			return this._error('UtilityService', 'logger');

		const type = content.type;
		switch(type) {
			case 'DEBUG':
				this._logger.debug('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
			case 'ERROR':
				this._logger.error('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
			case 'EXCEPTION':
				this._logger.exception('UtilityService', 'logger', content.ex, correlationId, true);
				break;
			case 'FATAL':
				this._logger.fatal('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
			case 'INFO':
				this._logger.info('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
			case 'TRACE':
				this._logger.trace('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
			case 'WARN':
				this._logger.warn('UtilityService', 'logger', content.message, content.data, correlationId, true);
				break;
		}

		return this._success(correlationId);
	}
}

export default UtilityService;
