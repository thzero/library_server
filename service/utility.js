import Service from './index';

class UtilityService extends Service {
	async logger(content) {
		if (!content)
			return this._error();

		const type = content.type;
		switch(type) {
			case 'DEBUG':
				this._logger.debug(content.message, content.data, true);
				break;
			case 'ERROR':
				this._logger.error(content.message, content.data, true);
				break;
			case 'EXCEPTION':
				this._logger.exception(content.ex, true);
				break;
			case 'FATAL':
				this._logger.fatal(content.message, content.data, true);
				break;
			case 'INFO':
				this._logger.info(content.message, content.data, true);
				break;
			case 'TRACE':
				this._logger.trace(content.message, content.data, true);
				break;
			case 'WARN':
				this._logger.warn(content.message, content.data, true);
				break;
		}

		return this._success();
	}
}

export default UtilityService;
