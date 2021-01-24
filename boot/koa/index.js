import Koa from 'koa';
import koaCors from '@koa/cors';
import koaHelmet from 'koa-helmet';
import koaStatic from 'koa-static';

import LibraryConstants from '../../constants';
import Utility from '@thzero/library_common/utility';

import TokenExpiredError from '../../errors/tokenExpired';

require('@thzero/library_common/utility/string');
import injector from '@thzero/library_common/utility/injector';

import BootMain from '@thzero/library_server/boot';

const ResponseTime = 'X-Response-Time';

class KoaBootMain extends BootMain {
	async _initApp(args, plugins) {
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
					this.loggerServiceI.exception('KoaBootMain', 'start', err);
				});
			}
		});

		app.on('error', (err, ctx) => {
			this.loggerServiceI.error('KoaBootMain', 'start', 'Uncaught Exception', err);
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
			// this.loggerServiceI.debug('KoaBootMain', 'start', 'auth-api-token.key', key);
			if (!String.isNullOrEmpty(key)) {
				const auth = ctx.config.get('auth');
				if (auth) {
					const apiKey = auth.apiKey;
					// this.loggerServiceI.debug('KoaBootMain', 'start', 'auth-api-token.apiKey', apiKey);
					// this.loggerServiceI.debug('KoaBootMain', 'start', 'auth-api-token.key===apiKey', (key === apiKey));
					if (key === apiKey) {
						ctx.state.apiKey = key;
						await next();
						return;
					}
				}
			}

			(async () => {
				await this.usageMetricsServiceI.register(ctx).catch((err) => {
					this.loggerServiceI.error('KoaBootMain', 'start', 'usageMetrics', err);
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
				this.loggerServiceI.error('KoaBootMain', 'start', 'usageMetrics', err);
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

		return app;
    }

	async _initAppPost(app, args) {
		this._initPostRoutes(app);
	}

	_initRoute(route) {
		this._routes.push(route);
	}
}

export default KoaBootMain;
