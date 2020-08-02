import Service from '@thzero/library_server/service/index';

class LoggerService extends Service {
	constructor() {
		super();

		this._loggers = [];
		this._loggerKeys = [];
	}

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
		console.log('-----');
		let loggerService;
		for(const key of this._loggerKeys) {
			console.log(`logger: ${key}`);
			loggerService = this._injector.getService(key);
			this._loggers.push(loggerService);
			await loggerService.initLogger(logLevel, prettify, configLogging);
		}
		console.log('-----\n\n');
	}

	register(key) {
		this._enforceNotNull(key, 'key');

		const logger = this._loggerKeys.find(l => l === key);
		if (logger)
			return;

		this._loggerKeys.push(key);
	}

	debug(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.debug(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - debug: ', err);
			}
		}
	}

	error(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.error(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - error: ', err);
			}
		}
	}

	exception(ex, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.exception(ex, isClient);
			}
			catch (err) {
				console.error('logger exception - exception: ', err);
			}
		}
	}

	fatal(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.fatal(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - fatal: ', err);
			}
		}
	}

	info(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.info(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - info: ', err);
			}
		}
	}

	trace(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.trace(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - trace: ', err);
			}
		}
	}

	warn(message, data, isClient) {
		let logger;
		let index = 0;
		const length = this._loggers.length;
		for (; index < length; index++) {
			logger = this._loggers[index];
			try {
				logger.warn(message, data, isClient);
			}
			catch (err) {
				console.error('logger exception - warn: ', err);
			}
		}
	}
}

export default LoggerService;
