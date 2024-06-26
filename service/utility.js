import fs from 'fs';
import path from 'path';
import { Mutex as asyncMutex } from 'async-mutex';

import LibraryServerConstants from '@thzero/library_server/constants.js';

import LibraryMomentUtility from '@thzero/library_common/utility/moment.js';

import Service from './index.js';

import Response from '@thzero/library_common/response/index.js';

class UtilityService extends Service {
	constructor() {
		super();

		this._servicePlans = null;
		this._serviceVersion = null;

		this._openSourceResponse = null;

		this._initializeResponse = null;
		this._mutexInitialize = new asyncMutex();
		this._ttlInitialize = null;
		this._ttlInitializeDiff = 1000 * 30;
	}

	async init(injector) {
		await super.init(injector);

		this._servicePlans = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_PLANS);
		this._serviceVersion = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_VERSION);

		await this._initializeOopenSource();
	}

	async initialize(correlationId) {
		const now = LibraryMomentUtility.getTimestamp();
		const ttlInitialize = this._ttlInitialize ? this._ttlInitialize : 0;
		const delta = now - ttlInitialize;
		if (this._initializeResponse && (delta <= this._ttlInitializeDiff))
			return this._initializeResponse;

		const release = await this._mutexInitialize.acquire();
		try {
			if (this._initializeResponse)
				return this._initializeResponse;

			const response = this._initResponse(correlationId);
			response.results = {};

			const responsePlans = await this._servicePlans.listing(correlationId);
			if (this._hasFailed(responsePlans))
				return responsePlans;

			response.results.plans = responsePlans.results;

			const responseVersion = await this._serviceVersion.version(correlationId);
			if (this._hasFailed(responseVersion))
				return responseVersion;

			response.results.version = responseVersion.results;

			await this._intialize(correlationId, response);

			this._ttlInitialize = LibraryMomentUtility.getTimestamp();
			this._initializeResponse = response;
			return response;
		}
		catch (err) {
			return this._error('UtilityService', 'initialize', null, err, null, null, correlationId);
		}
		finally {
			release();
		}
	}

	async logger(content, correlationId) {
		try {
			if (!content)
				return this._error('UtilityService', 'logger');
	
			const type = content.type;
			switch(type) {
				case 'DEBUG':
					this._logger.debug('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'ERROR':
					this._logger.error('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'EXCEPTION':
					this._logger.exception('UtilityService', 'logger', content.ex, correlationId, true);
					break;
				case 'FATAL':
					this._logger.fatal('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'INFO':
					this._logger.info('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'TRACE':
					this._logger.trace('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'WARN':
					this._logger.warn('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
			}
	
			return this._success(correlationId);
		}
		catch (err) {
			console.log(`UtilityService.initialize - ${correlationId}`, err);
			return Response.error('ServerConfigService', 'getBackend', null, err, null, null, correlationId);
		}
	}
	
	async openSource(correlationId) {
		return this._openSourceResponse ? this._openSourceResponse : this._error();
	}

	_intialize(correlationId, response) {
	}

	async _initializeOopenSource(correlationId) {
		this._openSourceResponse = this._initResponse(correlationId);
		this._openSourceResponse.results = [];

		try {
			const __dirname = path.resolve();
			const dir = path.join(path.resolve(__dirname), 'node_modules', '@thzero');
			const dirs = await fs.promises.readdir(dir);
	
			console.log();
			console.log('\t----open.source.initialization-----------------');
			
			let file;
			let importPath;
			let fileI;
			let items;
			for (const item of dirs) {
				try {
					file = path.join(dir, item, 'openSource.js');
					console.log(`\t${file}...`);
					if (!fs.existsSync(file)){
						console.log(`\t...not found.`);
						continue;
					}
						
					importPath = ['@thzero', item, 'openSource.js'].join('/');
					console.log(`\t\t${importPath}...`);
					fileI = await import(importPath);
					if (!fileI.default) {
						console.log(`\t...failed to load.`);
						continue;
					}

					items = fileI.default();
					items.forEach(element => {
						if (element.category !== 'server')
							return;
						if (this._openSourceResponse.results.filter(l => l.name === element.name).length > 0)
							return;
						this._openSourceResponse.results.push(element);
					});
					console.log(`\t...processed.`);
				}
				catch(err) {
					console.log(`\t...failed.`, err);
					this._logger.warn('UtilityService', '_initializeOopenSource', null, err, correlationId);
				}
			}
		}
		catch(err) {
			this._logger.warn('UtilityService', '_initializeOopenSource', null, err, correlationId);
		}
		finally {
			console.log('\t----open.source.initialization.complete--------');
			console.log();
		}

		// response.results = await this._openSourceServer(correlationId);
		this._openSource(correlationId, this._openSourceResponse.results);

		this._openSourceResponse.results = this._openSourceResponse.results.sort((a, b) => a.name.localeCompare(b.name));
	}

	_openSource(correlationId, openSource) {
	}
}

export default UtilityService;
