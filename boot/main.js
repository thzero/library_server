import Koa from 'koa';
import koaCors from '@koa/cors';
import koaHelmet from 'koa-helmet';
import koaStatic from 'koa-static';

import { createTerminus } from '@godaddy/terminus';

import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/en'; // load on demand

import * as swagger from 'swagger2';
import { ui as swagger_ui } from 'swagger2-koa';

import config from 'config';

import LibraryConstants from '../constants';

import Utility from '../utility';

import NotImplementedError from '../errors/notImplemented';
import TokenExpiredError from '../errors/tokenExpired';

require('../utility/string');
import injector from '../utility/injector';

import homeRoute from '../routes/home';
import versionRoute from '../routes/version';

import usageMetricsService from '../service/usageMetrics';

const ResponseTime = 'X-Response-Time';

class BootMain {
	async start(...args) {
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
					this.loggerServiceI.error(null, err);
				});
			}
		});

		app.on('error', (err, ctx) => {
			this.loggerServiceI.error(null, err);
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
			this.loggerServiceI.info(`${ctx.method} ${ctx.url} - ${rt}`);
		});

		// x-response-time
		app.use(async (ctx, next) => {
			const start = Utility.timerStart();
			await next();
			const delta = Utility.timerStop(start, true);
			ctx.set(ResponseTime, delta);
		});

		app.use(koaStatic('./public'));

		var env = (process.env.NODE_ENV || 'dev').toLowerCase();
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
			// this.loggerServiceI.debug('auth-api-token.key', key);
			if (!String.isNullOrEmpty(key)) {
				const auth = ctx.config.get('auth');
				if (auth) {
					const apiKey = auth.apiKey;
					// this.loggerServiceI.debug('auth-api-token.apiKey', apiKey);
					// this.loggerServiceI.debug('auth-api-token.key===apiKey', (key === apiKey));
					if (key === apiKey) {
						ctx.state.apiKey = key;
						await next();
						return;
					}
				}
			}

			(async () => {
				await this.usageMetricsServiceI.register(ctx).catch((err) => {
					this.loggerServiceI.error(null, err);
				});
			})();

			console.log('Unauthorized... auth-api-token failure');
			ctx.throw(401);
		});

		// usage metrics
		app.use(async (ctx, next) => {
			await next();
			await this.usageMetricsServiceI.register(ctx).catch((err) => {
				this.loggerServiceI.error(null, err);
			});
		});

		this._routes = [];

		for (const pluginRoute of plugins)
			pluginRoute.initRoutes(this._routes);

		this._initRoute(this._initRoutesVersion());

		await this._initRoutes();

		this._initRoute(this._initRoutesHome());

		for (const route of this._routes) {
			await route.init(injector)
			app
				.use(route.router.routes())
				.use(route.router.allowedMethods());
			console.log(route.router.stack.map(i => i.path));
			console.log(route.router.stack.map(i => i.methods));
		}

		this.port = this._appConfig.get('port');
		this.loggerServiceI.info(`config.port: ${this.port}`);
		this.loggerServiceI.info(`process.env.PORT: ${process.env.PORT}`);
		this.port = process.env.PORT || this.port;
		this.loggerServiceI.info(`selected.port: ${this.port}`);
		const serverHttp = require('http').createServer(app.callback());

		function onSignal() {
			this.loggerServiceI.info(`server is starting cleanup`);
			const cleanupFuncs = [];
			this._initCleanup(cleanupFuncs);
			return Promise.all(cleanupFuncs);
		}

		function onShutdown() {
			this._initShutdown();
			this.loggerServiceI.info(`cleanup finished, server is shutting down`);
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

		this.loggerServiceI.info(`Starting HTTP on: `, serverHttp.address());
	}

	async _init(plugins) {
		try {
			// https://github.com/lorenwest/node-config/wiki
			this._appConfig = config.get('app');

			injector.addSingleton(LibraryConstants.InjectorKeys.CONFIG, this._appConfig);

			this._repositories = new Map();

			await this._initRepositories();
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC, this._initRepositoriesUsageMetrics());

			for (const pluginRepository of plugins)
				pluginRepository.initRepositories(injector, this._repositories);

			this._services = new Map();

			this.loggerServiceI = this._initServicesLogger();
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_LOGGER, this.loggerServiceI);
			this.usageMetricsServiceI = this._intiServicesUsageMetrics();
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_USAGE_METRIC, this.usageMetricsServiceI);

			for (const pluginService of plugins)
				pluginService.initServices(injector, this._repositories);

			await this._initServices();

			for (const [key, value] of this._services) {
				console.log(`services.init - ${key}`);
				await value.init(injector);
			}

			this._services = new Map();

			await this._initServicesSecondary();

			for (const [key, value] of this._services) {
				if (value.initialized)
					continue;

				console.log(`services.init.secondary - ${key}`);
				await value.init(injector);
			}

			for (const [key, value] of this._repositories) {
				console.log(`repositories.init - ${key}`);
				await value.init(injector);
			}

			dayjs.locale('en'); // use English locale globally
			dayjs.extend(localeData);
			dayjs.extend(localizedFormat);
			dayjs.extend(utc);
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

	_initRoutesHome() {
		return new homeRoute();
	}

	_initRoutesVersion() {
		return new versionRoute();
	}

	async _initServices() {
	}

	async _initServicesSecondary() {
	}

	_initServicesLogger() {
		throw new NotImplementedError();
	}

	_intiServicesUsageMetrics() {
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
}

export default BootMain;
