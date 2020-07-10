import pino from 'pino';

import Service from '../service/index';

class LoggerService extends Service {
	async init(injector) {
		await super.init(injector);

		const configLogging = this._config.get('logging');
		const logLevel = configLogging.level || process.env.LOG_LEVEL || null;
		const prettify = configLogging.prettify || process.env.LOG_PRETTIFY || false;
		console.log('\n\n-----');
		console.log(`configLogging.level: ${configLogging.level}`);
		console.log(`process.env.LOG_LEVEL: ${process.env.LOG_LEVEL}`);
		console.log(`logLevel: ${logLevel}`);
		console.log('-----');
		console.log(`configLogging.prettify: ${configLogging.prettify}`);
		console.log(`process.env.LOG_PRETTIFY: ${process.env.LOG_PRETTIFY}`);
		console.log(`prettify: ${prettify}`);
		console.log('-----\n\n');

		if (prettify) {
			this._log = pino({
				level: logLevel,
				prettyPrint: {
					levelFirst: true
				},
				// eslint-disable-next-line
				prettifier: require(require.resolve('pino-pretty', { paths: [ require.main.filename ] }))
			});
		}
		else {
			this._log = pino({
				level: logLevel
			});
		}
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
