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

import plansService from '../service/plans';
import usageMetricsService from '../service/usageMetrics';

import adminNewsRoute from '../routes/admin/news';
import adminUsersRoute from '../routes/admin/users'
import homeRoute from '../routes/home';
import newsRoute from '../routes/news';
import usersRoute from '../routes/users';
import versionRoute from '../routes/version';

const ResponseTime = 'X-Response-Time';

class BootMain {
	async start() {
		await this._init();

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
		this._initRoute(this._initRoutesAdminNews());
		this._initRoute(this._initRoutesAdminUsers());
		this._initRoute(this._initRoutesNews());
		this._initRoute(this._initRoutesUsers(),);
		this._initRoute(this._initRoutesVersion());

		await this._initRoutes();

		this._initRoute(this._initRoutesHome());

		for (const route of this._routes) {
			route.init(injector)
			app
				.use(route.router.routes())
				.use(route.router.allowedMethods());
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

	async _init() {
		try {
			// https://github.com/lorenwest/node-config/wiki
			this._appConfig = config.get('app');

			injector.addSingleton(LibraryConstants.InjectorKeys.CONFIG, this._appConfig);

			this._repositories = new Map();
			this._services = new Map();
			this.loggerServiceI = this._initServicesLogger();
			this.usageMetricsServiceI = this._intiServicesUsageMetrics();

			this._injectService(LibraryConstants.InjectorKeys.SERVICE_LOGGER, this.loggerServiceI);
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_USAGE_METRIC, this.usageMetricsServiceI);

			await this._initRepositories();
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_NEWS, this._initRepositoriesAdminNews());
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_USERS, this._initRepositoriesAdminUsers());
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_NEWS, this._initRepositoriesNews());
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_PLANS, this._initRepositoriesPlans());
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USAGE_METRIC, this._initRepositoriesUsageMetrics());
			this._injectRepository(LibraryConstants.InjectorKeys.REPOSITORY_USERS, this._initRepositoriesUsers());

			this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_NEWS, this._initServicesAdminNews());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_ADMIN_USERS, this._initServicesAdminUsers());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_AUTH, this._initServicesAuth());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_NEWS, this._initServicesNews());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_PLANS, this._initServicesPlans());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS, this._initServicesNewsValidation());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_SECURITY, this._initServicesSecurity());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_USERS, this._initServicesUser());
			this._injectService(LibraryConstants.InjectorKeys.SERVICE_VERSION, this._initServiceVersion());
			await this._initServices();

			for (const [key, value] of this._services) {
				console.log(`services.init - ${key}`);
				value.init(injector);
			}

			this._services = new Map();

			await this._initServicesSecondary();

			for (const [key, value] of this._services) {
				if (value.initialized)
					continue;

				console.log(`services.init.secondary - ${key}`);
				value.init(injector);
			}

			for (const [key, value] of this._repositories) {
				console.log(`repositories.init - ${key}`);
				value.init(injector);
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

	async _initRepositories() {
		throw new NotImplementedError();
	}

	_initRepositoriesAdminNews() {
		throw new NotImplementedError();
	}

	_initRepositoriesAdminUsers() {
		throw new NotImplementedError();
	}

	_initRepositoriesNews() {
		throw new NotImplementedError();
	}

	_initRepositoriesPlans() {
		throw new NotImplementedError();
	}

	_initRepositoriesUsageMetrics() {
		throw new NotImplementedError();
	}

	_initRepositoriesUsers() {
		throw new NotImplementedError();
	}

	_initRoute(route) {
		this._routes.push(route);
	}

	async _initRoutes() {
		throw new NotImplementedError();
	}

	_initRoutesAdminNews() {
		return new adminNewsRoute();
	}

	_initRoutesAdminUsers() {
		return new adminUsersRoute();
	}

	_initRoutesHome() {
		return new homeRoute();
	}

	_initRoutesNews() {
		return new newsRoute();
	}

	_initRoutesUsers() {
		return new usersRoute();
	}

	_initRoutesVersion() {
		return new versionRoute();
	}

	async _initServices() {
		throw new NotImplementedError();
	}

	async _initServicesSecondary() {
	}

	_initServicesAdminNews() {
		throw new NotImplementedError();
	}

	_initServicesAdminUsers() {
		throw new NotImplementedError();
	}

	_initServicesAuth() {
		throw new NotImplementedError();
	}

	_initServicesLogger() {
		throw new NotImplementedError();
	}

	_initServicesNews() {
		throw new NotImplementedError();
	}

	_initServicesPlans() {
		return new plansService();
	}

	_initServicesNewsValidation() {
		throw new NotImplementedError();
	}

	_initServicesSecurity() {
		throw new NotImplementedError();
	}

	_intiServicesUsageMetrics() {
		return new usageMetricsService();
	}

	_initServicesUser() {
		throw new NotImplementedError();
	}

	_initServiceVersion() {
		throw new NotImplementedError();
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
