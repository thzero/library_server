import Koa from 'koa';
import koaCors from '@koa/cors';
import koaHelmet from 'koa-helmet';
import koaStatic from 'koa-static';

import { createTerminus } from '@godaddy/terminus';

import * as swagger from 'swagger2';
import { ui as swagger_ui } from 'swagger2-koa';

import config from 'config';

import LibraryConstants from '../constants';

import Utility from '@thzero/library_common/utility';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';
import TokenExpiredError from '..//errors/tokenExpired';

require('@thzero/library_common/utility/string');
import injector from '@thzero/library_common/utility/injector';

import configService from '../service/config';
import loggerService from '../service/logger';
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
		// this._appConfig = config.get('app');
		this._appConfig = new configService(config.get('app'));

		const plugins = this._initPlugins(args);

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
			ctx.correlationId = ctx.response.header[LibraryConstants.Headers.CorrelationId]
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

		const env = (process.env.NODE_ENV || 'dev').toLowerCase();
		if (env == 'dev') {
			const document = swagger.loadDocumentSync('./config/swagger.yml');
			app.use(swagger_ui(document, '/swagger'));
		}

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

		// usage metrics
		app.use(async (ctx, next) => {
			await next();
			await this.usageMetricsServiceI.register(ctx).catch((err) => {
				this.loggerServiceI.error('BootMain', 'start', 'usageMetrics', err);
			});
		});

		this._routes = [];

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

		const terminusOptions = {
			// health check options
			healthChecks: {
				'/healthcheck': healthCheck, // a function returning a promise indicating service health,
				verbatim: true // [optional = false] use object returned from /healthcheck verbatim in response
			},

			// cleanup options
			signals: [ 'SIGINT', 'SIGTERM' ],
			onSignal: onSignal.bind(this), // [optional] cleanup function, returning a promise (used to be onSigterm)
			onShutdown: onShutdown.bind(this) // [optional] called right before exiting
		};

		createTerminus(serverHttp, terminusOptions);

		serverHttp.listen(this.port);
		this._initServer(serverHttp);

		this.loggerServiceI.info2(`Starting HTTP on: `, serverHttp.address());
	}

	async _init(plugins) {
		try {
			injector.addSingleton(LibraryConstants.InjectorKeys.SERVICE_CONFIG, this._appConfig);

			this._repositories = new Map();

			for (const pluginRepository of plugins)
				await pluginRepository.initRepositories(this._repositories);

			await this._initRepositories();
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC, this._initRepositoriesUsageMetrics());

			this._services = new Map();

			this.loggerServiceI = this._initServicesLogger();
			this._initServicesLoggers();
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_LOGGER, this.loggerServiceI);

			const monitoringService = this._initServicesMonitoring();
			if (monitoringService)
				this._injectService(LibraryConstants.InjectorKeys.SERVICE_MONITORING, monitoringService);

			this.usageMetricsServiceI = this._initServicesUsageMetrics();
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_USAGE_METRIC, this.usageMetricsServiceI);

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

	async _initRepositories() {
	}

	_initRepositoriesUsageMetrics() {
		throw new NotImplementedError();
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

	_initServer(serverHttp) {
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
