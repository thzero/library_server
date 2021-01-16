import Koa from 'koa';
import koaCors from '@koa/cors';
import koaHelmet from 'koa-helmet';
import koaStatic from 'koa-static';
import internalIp from 'internal-ip';

import { createTerminus } from '@godaddy/terminus';

import config from 'config';

import LibraryConstants from '../constants';
import LibraryCommonConstants from '@thzero/library_common/constants';

import Utility from '@thzero/library_common/utility';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';
import TokenExpiredError from '../errors/tokenExpired';

require('@thzero/library_common/utility/string');
import injector from '@thzero/library_common/utility/injector';

import usageMetricsRepository from '../repository/usageMetrics/devnull';

import configService from '../service/config';
import loggerService from '@thzero/library_common/service/logger';
import usageMetricsService from '../service/usageMetrics';

const ResponseTime = 'X-Response-Time';

class BootMain {
	async start(...args) {
		process.on('uncaughtException', function(err) {
			console.log('Caught exception', err);
			return process.exit(99);
		});

		this._injector = injector;

		// https://github.com/lorenwest/node-config/wiki
		this._appConfig = new configService(config.get('app'));

		const plugins = this._initPlugins(args);

		this._servicesPost = new Map();

		await this._init(plugins);

		const app = new Koa();
		// https://github.com/koajs/cors
		app.use(koaCors({
			allowMethods: 'GET,POST,DELETE',
			maxAge : 7200,
			allowHeaders: `${LibraryConstants.Headers.AuthKeys.API}, ${LibraryConstants.Headers.AuthKeys.AUTH}, ${LibraryConstants.Headers.CorrelationId}, Content-Type`,
			credentials: true,
			origin: '*'
		}));
		// https://www.npmjs.com/package/koa-helmet
		app.use(koaHelmet());

		// error
		app.use(async (ctx, next) => {
			try {
				await next();
			}
			catch (err) {
				ctx.status = err.status || 500;
				if (err instanceof TokenExpiredError) {
					ctx.status = 401;
					ctx.response.header['WWW-Authenticate'] = 'Bearer error="invalid_token", error_description="The access token expired"'
				}
				ctx.app.emit('error', err, ctx);
				await this.usageMetricsServiceI.register(ctx, err).catch(() => {
					this.loggerServiceI.exception('BootMain', 'start', err);
				});
			}
		});

		app.on('error', (err, ctx) => {
			this.loggerServiceI.error('BootMain', 'start', 'Uncaught Exception', err);
		});

		// config
		app.use(async (ctx, next) => {
			ctx.config = this._appConfig;
			await next();
		});

		// correlationId
		app.use(async (ctx, next) => {
			ctx.correlationId = ctx.request.header[LibraryConstants.Headers.CorrelationId]
			await next();
		});

		// logger
		app.use(async (ctx, next) => {
			await next();
			const rt = ctx.response.get(ResponseTime);
			this.loggerServiceI.info2(`${ctx.method} ${ctx.url} - ${rt}`);
		});

		// x-response-time
		app.use(async (ctx, next) => {
			const start = Utility.timerStart();
			await next();
			const delta = Utility.timerStop(start, true);
			ctx.set(ResponseTime, delta);
		});

		app.use(koaStatic('./public'));

		this._initPreAuth(app);

		// auth-api-token
		app.use(async (ctx, next) => {
			if (ctx.originalUrl === '/favicon.ico') {
				await next();
				return;
			}

			const key = ctx.get(LibraryConstants.Headers.AuthKeys.API);
			// this.loggerServiceI.debug('BootMain', 'start', 'auth-api-token.key', key);
			if (!String.isNullOrEmpty(key)) {
				const auth = ctx.config.get('auth');
				if (auth) {
					const apiKey = auth.apiKey;
					// this.loggerServiceI.debug('BootMain', 'start', 'auth-api-token.apiKey', apiKey);
					// this.loggerServiceI.debug('BootMain', 'start', 'auth-api-token.key===apiKey', (key === apiKey));
					if (key === apiKey) {
						ctx.state.apiKey = key;
						await next();
						return;
					}
				}
			}

			(async () => {
				await this.usageMetricsServiceI.register(ctx).catch((err) => {
					this.loggerServiceI.error('BootMain', 'start', 'usageMetrics', err);
				});
			})();

			console.log('Unauthorized... auth-api-token failure');
			ctx.throw(401);
		});

		this._initPostAuth(app);

		// usage metrics
		app.use(async (ctx, next) => {
			await next();
			await this.usageMetricsServiceI.register(ctx).catch((err) => {
				this.loggerServiceI.error('BootMain', 'start', 'usageMetrics', err);
			});
		});

		this._routes = [];

		this._initPreRoutes(app);

		for (const pluginRoute of plugins)
			await pluginRoute.initRoutes(this._routes);

		await this._initRoutes();

		for (const route of this._routes) {
			await route.init(injector)
			app
				.use(route.router.routes())
				.use(route.router.allowedMethods());
			console.log(route.router.stack.map(i => i.path));
			console.log(route.router.stack.map(i => i.methods));
		}

		this.port = this._appConfig.get('port');
		this.loggerServiceI.info2(`config.port: ${this.port}`);
		this.loggerServiceI.info2(`process.env.PORT: ${process.env.PORT}`);
		this.port = process.env.PORT || this.port;
		this.loggerServiceI.info2(`selected.port: ${this.port}`);
		const serverHttp = require('http').createServer(app.callback());

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

		const healthcheckPath = this._appConfig.get('healthcheck.path', LibraryConstants.HealthCheck.DefaultPath);
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

		createTerminus(serverHttp, terminusOptions);

		const listen = async (port) => new Promise((resolve, reject) => {
			serverHttp.listen(port, (err) => {
				if (err) {
					reject(err);
					return;
				}

				resolve();
			});
		});
		await listen(this.port);
		this.address = serverHttp.address() ? serverHttp.address().address : null;
		if (this.address === '::')
			this.address = await internalIp.v4();

		await this._initServer(serverHttp);

		for (const [key, value] of this._servicesPost) {
			console.log(`services.init.post - ${key}`);
			if (value.initPost)
				await value.initPost();
		}

		this._initPostRoutes(app);

		await this._initServerDiscovery(serverHttp);

		this.loggerServiceI.info2(`Starting HTTP on: `, this.address);
	}

	async _init(plugins) {
		try {
			injector.addSingleton(LibraryCommonConstants.InjectorKeys.SERVICE_CONFIG, this._appConfig);

			this._repositories = new Map();

			for (const pluginRepository of plugins)
				await pluginRepository.initRepositories(this._repositories);

			await this._initRepositories();
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC, this._initRepositoriesUsageMetrics());

			this._services = new Map();

			this.loggerServiceI = this._initServicesLogger();
			this._initServicesLoggers();
			this._injectService(LibraryCommonConstants.InjectorKeys.SERVICE_LOGGER, this.loggerServiceI);

			const monitoringService = this._initServicesMonitoring();
			if (monitoringService)
				this._injectService(LibraryCommonConstants.InjectorKeys.SERVICE_MONITORING, monitoringService);

			this.usageMetricsServiceI = this._initServicesUsageMetrics();
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_USAGE_METRIC, this.usageMetricsServiceI);

			this.resourceDiscoveryServiceI = this._initServicesDiscoveryResources();
			if (this.resourceDiscoveryServiceI)
				this._injectService(LibraryConstants.InjectorKeys.SERVICE_DISCOVERY_RESOURCES, this.resourceDiscoveryServiceI);

			this.mdnsDiscoveryServiceI = this._initServicesDiscoveryMdns();
			if (this.mdnsDiscoveryServiceI)
				this._injectService(LibraryConstants.InjectorKeys.SERVICE_DISCOVERY_MDNS, this.mdnsDiscoveryServiceI);

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

			Utility.initDateTime();
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

	_initPlugins(plugins) {
		let obj;
		const results = [];
		for (const plugin of plugins) {
			obj = new plugin();
			obj.init(this._appConfig, injector);
			results.push(obj);
		}
		return results;
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
		this._routes.push(route);
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

	async _initServerDiscovery(serverHttp) {
		if (!this.resourceDiscoveryServiceI && !this.mdnsDiscoveryServiceI)
			return;

		const opts = await this._initServerDiscoveryOpts();

		await this._initServerDiscoveryMdns(Utility.cloneDeep(opts));
		await this._initServerDiscoveryResources(Utility.cloneDeep(opts));
	}

	async _initServerDiscoveryMdns(opts) {
		if (!this.mdnsDiscoveryServiceI)
			return;

		await this.mdnsDiscoveryServiceI.initialize(Utility.generateId(), await this._initServerDiscoveryOptsMdns(opts));
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

		await this.resourceDiscoveryServiceI.initialize(Utility.generateId(), await this._initServerDiscoveryOptsResources(opts));
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

	_registerServicesLogger(key, service) {
		this._injectService(key, service);
		this.loggerServiceI.register(key);
	}
}

export default BootMain;
