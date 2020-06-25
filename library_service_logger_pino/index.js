import pino from 'pino';

import Utility from '../library/utility';

import Service from '../library/service/index';

class LoggerService extends Service {
	constructor() {
		super();

		if (Utility.isDev) {
			this._log = pino({
				level: process.env.LOG_LEVEL,
				prettyPrint: {
					levelFirst: true
				},
				// eslint-disable-next-line
				prettifier: require(require.resolve('pino-pretty', { paths: [ require.main.filename ] }))
			});
		}
		else
			this._log = pino();
	}

	debug(message, data) {
		data = (data === undefined ? null : data);
		this._log.debug(data, message);
	}

	error(message, data) {
		data = (data === undefined ? null : data);
		this._log.error(data, message);
	}

	exception(ex) {
		ex = (ex === undefined ? null : ex);
		this._log.error(ex);
	}

	fatal(ex) {
		ex = (ex === undefined ? null : ex);
		this._log.fatal(ex);
	}

	info(message, data) {
		data = (data === undefined ? null : data);
		this._log.info(data, message);
	}

	trace(message, data) {
		data = (data === undefined ? null : data);
		this._log.trace(data, message);
	}

	warn(message, data) {
		data = (data === undefined ? null : data);
		this._log.warn(data, message);
	}
}

export default LoggerService;
