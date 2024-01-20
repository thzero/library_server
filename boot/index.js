import { createTerminus } from '@godaddy/terminus';

import config from 'config';

import {internalIpV4} from '@thzero/library_server/utility/internalIp/index.js';

import LibraryServerConstants from '../constants.js';
import LibraryCommonServiceConstants from '@thzero/library_common_service/constants.js';

import LibraryCommonUtility from '@thzero/library_common/utility/index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

import nullMonitoringService from '../service/monitoring.js';

// require('@thzero/library_server/utility/string.cjs');
import String2 from '@thzero/library_common/utility/string.js';

// String.capitalize = function(word) {
// 	if (String.isNullOrEmpty(word))
// 		return word;
// 	return word[0].toUpperCase() + word.slice(1).toLowerCase();
// };

// String.isNullOrEmpty = function(value) {
// 	//return !(typeof value === 'string' && value.length > 0)
// 	return !value;
// }

// String.isString = function(value) {
// 	return (typeof value === "string" || value instanceof String);
// }

// String.trim = function(value) {
// 	if (!value || !String.isString(value))
// 		return value;
// 	return value.trim();
// }

for (const funcName in String2) {
	String[funcName] = String2[funcName];
}

import injector from '@thzero/library_common/utility/injector.js';

import usageMetricsRepository from '../repository/usageMetrics/devnull.js';

import configService from '../service/config.js';
import loggerService from '@thzero/library_common_service/service/logger.js';
import usageMetricsService from '../service/usageMetrics.js';

class BootMain {
	async start(...args) {
		process.on('uncaughtException', function(err) {
			console.log('Caught exception', err);
			return process.exit(99);
		});

		const idGeneratorOverride = this._initIdGenerator();
		if (idGeneratorOverride)
			LibraryCommonUtility.setIdGenerator(idGeneratorOverride);
		const idGeneratorAlphabet = this._initIdGeneratorAlphabet();
		if (idGeneratorAlphabet)
			LibraryCommonUtility.setIdGeneratorAlphabet(idGeneratorAlphabet);
		const idGeneratorLengthLong = this._initIdGeneratorLengthLong();
		if (idGeneratorLengthLong)
			LibraryCommonUtility.setIdGeneratorLengthLong(idGeneratorLengthLong);
		const idGeneratorLengthShort = this._initIdGeneratorLengthShort();
		if (idGeneratorLengthShort)
			LibraryCommonUtility.setIdGeneratorLengthShort(idGeneratorLengthShort);

		this._injector = injector;

		// https://github.com/lorenwest/node-config/wiki
		this._appConfig = new configService(config.get('app'));

		this._servicesPost = new Map();

		const plugins = this._determinePlugins(args);
		await await this._initPlugins(plugins);
		
		// this.ip = this._appConfig.get('ip', null);
		// this.loggerServiceI.info2(`config.ip.override: ${this.ip}`);
		// this.port = this._appConfig.get('port');
		// this.loggerServiceI.info2(`config.port.override: ${this.port}`);
		// this.loggerServiceI.info2(`process.env.PORT: ${process.env.PORT}`);
		// this.port = process.env.PORT || this.port;
		// this.loggerServiceI.info2(`selected.port: ${this.port}`);

		const results = await this._initApp(args, plugins);

		function onSignal() {
			this.loggerServiceI.info2(`server is starting cleanup`);
			const cleanupFuncs = [];
			this._initCleanup(cleanupFuncs);
			this._initCleanupDiscovery(cleanupFuncs);
			return Promise.all(cleanupFuncs);
		}

		function onShutdown() {
			this._initShutdown();
			this.loggerServiceI.info2(`cleanup finished, server is shutting down`);
		}

		function healthCheck() {
			return Promise.resolve(
				// optionally include a resolve value to be included as
				// info in the health check response
			)
		}

		const healthcheckPath = this._appConfig.get('healthcheck.path', LibraryServerConstants.HealthCheck.DefaultPath);
		if (!healthcheckPath.startsWith('/'))
			healthcheckPath = '/' + healthcheckPath;

		const healthCheckOptions = {
			verbatim: true // [optional = false] use object returned from /healthcheck verbatim in response
		};
		if (healthCheck)
			healthCheckOptions[healthcheckPath] = healthCheck;

		const terminusOptions = {
			// health check options
			// healthChecks: {
			// 	healthcheckPath: healthCheck, // a function returning a promise indicating service health,
			// 	verbatim: true // [optional = false] use object returned from /healthcheck verbatim in response
			// },
			healthChecks: healthCheckOptions,

			// cleanup options
			signals: [ 'SIGINT', 'SIGTERM' ],
			onSignal: onSignal.bind(this), // [optional] cleanup function, returning a promise (used to be onSigterm)
			onShutdown: onShutdown.bind(this) // [optional] called right before exiting
		};

		createTerminus(results.server, terminusOptions);
		
		// const self = this;
		// const listen = async (port, address) => new Promise((resolve, reject) => {
		// 	self._initAppListen(results.app, results.server, address, port, (err) => {
		// 		if (err) {
		// 			reject(err);
		// 			return;
		// 		}

		// 		resolve();
		// 	});
		// });
		// await listen(this.port, this.ip);
		// this.address = results.server.address() ? results.server.address().address : null;
		// if (this.address === '::')
		// 	this.address = await internalIpV4();

		await this._initServer(results.server);

		for (const [key, value] of this._servicesPost) {
			console.log(`services.init.post - ${key}`);
			if (value.initPost)
				await value.initPost();
		}
		this._initAppPost(results.app, args);

		console.log();
		this.ip = this._appConfig.get('ip', null);
		console.log(`config.ip.override: ${this.ip}`);
		this.port = this._appConfig.get('port');
		console.log(`config.port.override: ${this.port}`);
		console.log(`process.env.PORT: ${process.env.PORT}`);
		this.port = process.env.PORT || this.port;
		console.log(`selected.port: ${this.port}`);
		console.log();

		const self = this;
		const listen = async (port, address) => new Promise((resolve, reject) => {
			self._initAppListen(results.app, results.server, address, port, (err) => {
				if (err) {
					reject(err);
					return;
				}

				resolve();
			});
		});
		await listen(this.port, this.ip);
		this.address = results.server.address() ? results.server.address().address : null;
		if (this.address === '::')
			this.address = await internalIpV4();

		console.log();
		console.log(`Starting HTTP on: ${this.address}:${this.port}`);

		await this._initServerDiscovery();
	}

	_determinePlugins(args) {
		let obj;
		const results = [];
		for (const plugin of args) {
			obj = plugin;
			if (!this._isObject(obj))
				obj = new plugin();
			obj.init(this._appConfig, injector);
			results.push(obj);
		}
		return results;
	}

	async _initApp(args, plugins) {
		throw new NotImplementedError();
	}

	_initAppListen(app, server, address, port, err) {
		throw new NotImplementedError();
	}

	async _initAppPost(app, args) {
	}

	_initIdGenerator() {
		return null;
	}

	_initIdGeneratorAlphabet() {
		return null;
	}

	_initIdGeneratorLengthLong() {
		return null;
	}

	_initIdGeneratorLengthShort() {
		return null;
	}

	async _initPlugins(plugins) {
		try {
			injector.addSingleton(LibraryCommonServiceConstants.InjectorKeys.SERVICE_CONFIG, this._appConfig);

			this._repositories = new Map();

			for (const pluginRepository of plugins)
				await pluginRepository.initRepositories(this._repositories);

			await this._initRepositories();
			this._injectRepository(LibraryServerConstants.InjectorKeys.REPOSITORY_USAGE_METRIC, this._initRepositoriesUsageMetrics());

			this._services = new Map();

			this.loggerServiceI = this._initServicesLogger();
			this._initServicesLoggers();
			this._injectService(LibraryCommonServiceConstants.InjectorKeys.SERVICE_LOGGER, this.loggerServiceI);

			let monitoringService = this._initServicesMonitoring();
			if (!monitoringService)
				monitoringService = new nullMonitoringService();	
			this._injectService(LibraryCommonServiceConstants.InjectorKeys.SERVICE_MONITORING, monitoringService);

			this.usageMetricsServiceI = this._initServicesUsageMetrics();
			this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_USAGE_METRIC, this.usageMetricsServiceI);

			this.resourceDiscoveryServiceI = this._initServicesDiscoveryResources();
			if (this.resourceDiscoveryServiceI)
				this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_DISCOVERY_RESOURCES, this.resourceDiscoveryServiceI);

			this.mdnsDiscoveryServiceI = this._initServicesDiscoveryMdns();
			if (this.mdnsDiscoveryServiceI)
				this._injectService(LibraryServerConstants.InjectorKeys.SERVICE_DISCOVERY_MDNS, this.mdnsDiscoveryServiceI);

			for (const pluginService of plugins)
				await pluginService.initServices(this._services);

			await this._initServices();

			for (const [key, value] of this._repositories) {
				console.log(`repositories.init - ${key}`);
				await value.init(injector);
			}

			for (const [key, value] of this._services) {
				console.log(`services.init - ${key}`);
				await value.init(injector);

				this._servicesPost.set(key, value);
			}

			this._services = new Map();

			await this._initServicesSecondary();

			for (const pluginService of plugins)
				await pluginService.initServicesSecondary(this._services);

			for (const [key, value] of this._services) {
				if (value.initialized)
					continue;

				console.log(`services.init.secondary - ${key}`);
				await value.init(injector);

				this._servicesPost.set(key, value);
			}

			LibraryCommonUtility.initDateTime();
		}
		finally {
			this._repositories = null;
			this._services = null;
		}
	}

	_initCleanup(cleanupFuncs) {
		// your clean logic, like closing database connections
	}

	_initCleanupDiscovery(cleanupFuncs) {
		if (this.resourceDiscoveryServiceI)
			cleanupFuncs.push(this.resourceDiscoveryServiceI.cleanup());
		if (this.mdnsDiscoveryServiceI)
			cleanupFuncs.push(this.mdnsDiscoveryServiceI.cleanup());
	}

	_initPostAuth(app) {
	}

	_initPreAuth(app) {
	}

	_initPostRoutes(app) {
	}

	_initPreRoutes(app) {
	}

	async _initRepositories() {
	}

	_initRepositoriesUsageMetrics() {
		return new usageMetricsRepository();
	}

	_initRoute(route) {
	}

	async _initRoutes() {
	}

	async _initServices() {
	}

	async _initServicesSecondary() {
	}

	_initServicesDiscoveryResources() {
		return null;
	}

	_initServicesDiscoveryMdns() {
		return null;
	}

	_initServicesLogger() {
		return new loggerService();
	}

	_initServicesLoggers() {
		throw new NotImplementedError();
	}

	_initServicesMonitoring() {
		return null;
	}

	_initServicesUsageMetrics() {
		return new usageMetricsService();
	}

	async _initServer(serverHttp) {
	}

	async _initServerDiscovery() {
		if (!this.resourceDiscoveryServiceI && !this.mdnsDiscoveryServiceI)
			return;

		const opts = await this._initServerDiscoveryOpts();

		await this._initServerDiscoveryMdns(LibraryCommonUtility.cloneDeep(opts));
		await this._initServerDiscoveryResources(LibraryCommonUtility.cloneDeep(opts));
	}

	async _initServerDiscoveryMdns(opts) {
		if (!this.mdnsDiscoveryServiceI)
			return;

		await this.mdnsDiscoveryServiceI.initialize(LibraryCommonUtility.correlationId(), await this._initServerDiscoveryOptsMdns(opts));
	}

	async _initServerDiscoveryOpts() {
		const dns = this._appConfig.get('dns', null);
		const grpc = this._appConfig.get('grpc', null);
		const secure = this._appConfig.get('secure', false);

		const opts = {
			address: this.address,
			port: this.port,
			healthCheck: 'healthcheck',
			secure: secure ? secure : false,
			dns: dns
		};

		if (grpc) {
			opts.grpc = {
				port: grpc ? grpc.port : null,
				secure: grpc ? (grpc.secure ? grpc.secure : false) : false
			};
		}

		return opts;
	}

	async _initServerDiscoveryOptsMdns(opts) {
		return opts;
	}

	async _initServerDiscoveryOptsResources(opts) {
		return opts;
	}

	async _initServerDiscoveryResources(opts) {
		if (!this.resourceDiscoveryServiceI)
			return;

		await this.resourceDiscoveryServiceI.initialize(LibraryCommonUtility.correlationId(), await this._initServerDiscoveryOptsResources(opts));
	}

	_injectRepository(key, repository) {
		console.log(`repositories.inject - ${key}`);
		this._repositories.set(key, repository);
		injector.addSingleton(key, repository);
	}

	_injectService(key, service) {
		console.log(`services.inject - ${key}`);
		this._services.set(key, service);
		injector.addSingleton(key, service);
	}

	_initShutdown() {
	}

	_isObject(objValue) {
		return objValue && typeof objValue === 'object';
	}

	_registerServicesLogger(key, service) {
		this._injectService(key, service);
		this.loggerServiceI.register(key);
	}
}

export default BootMain;
