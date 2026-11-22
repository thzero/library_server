import fs from 'fs';
import path from 'path';

import LibraryServerConstants from '../constants.js';

import LibraryMomentUtility from '@thzero/library_common/utility/moment.js';

import Service from './index.js';

import Response from '@thzero/library_common/response/index.js';

class UtilityService extends Service {
	constructor() {
		super();

		this._servicePlans = null;
		this._serviceVersion = null;

		this._openSourceResponse = null;

		this._initializePending = null;
		this._initializeResponse = null;
		this._ttlInitialize = null;
		this._ttlInitializeDiff = 1000 * 30;

		this._loggerClient = UtilityService.loggerClientDefaults();
		this._loggerClientWindow = 0;
		this._loggerClientCount = 0;
		this._loggerClientDropped = 0;
	}

	async init(injector) {
		await super.init(injector);

		this._servicePlans = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_PLANS);
		this._serviceVersion = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_VERSION);

		this._initLoggerClient();

		await this._initializeOopenSource();
	}

	// Stale-while-revalidate. A cached response is always served at once; once it
	// is past its TTL, one refresh runs in the background and the next call after
	// it lands gets the new one. Only a cold cache makes callers wait, and they
	// all wait on the same build.
	//
	// This used to take a mutex once the TTL had passed, and the check inside the
	// lock ignored the TTL. So from 30s after the first call every request queued
	// on the mutex to be handed the same response, which never refreshed.
	async initialize(correlationId) {
		if (this._initializeResponse) {
			if (this._initializeExpired())
				this._initializeRefresh(correlationId);
			return this._initializeFor(correlationId, this._initializeResponse);
		}

		return this._initializeFor(correlationId, await this._initializeRefresh(correlationId));
	}

	async logger(correlationId, content) {
		try {
			if (!content || (typeof content !== 'object'))
				return this._error('UtilityService', 'logger', 'Invalid content.', null, null, null, correlationId);

			if (!this._loggerClientAllowed(correlationId))
				return this._success(correlationId);

			const message = this._loggerClientTruncate(content.message, this._loggerClient.maxMessageLength);
			const data = this._loggerClientData(content.data);

			switch(content.type) {
				case 'DEBUG':
					this._logger.debug('UtilityService', 'logger', message, data, correlationId, true);
					break;
				case 'ERROR':
					this._logger.error('UtilityService', 'logger', message, data, correlationId, true);
					break;
				case 'EXCEPTION':
					this._logger.exception('UtilityService', 'logger', this._loggerClientData(content.ex), correlationId, true);
					break;
				case 'FATAL':
					this._logger.fatal('UtilityService', 'logger', content.message, content.data, correlationId, true);
					break;
				case 'INFO':
					this._logger.info('UtilityService', 'logger', message, data, correlationId, true);
					break;
				case 'TRACE':
					this._logger.trace('UtilityService', 'logger', message, data, correlationId, true);
					break;
				case 'WARN':
					this._logger.warn('UtilityService', 'logger', message, data, correlationId, true);
					break;
			}

			return this._success(correlationId);
		}
		catch (err) {
			console.log(`UtilityService.logger - ${correlationId}`, err);
			return Response.error('UtilityService', 'logger', null, err, null, null, correlationId);
		}
	}

	static loggerClientDefaults() {
		return { maxMessageLength: 1000, maxDataLength: 8000, maxPerSecond: 50 };
	}

	_initializeFor(correlationId, response) {
		if (!response)
			return response;

		const copy = Object.assign(Object.create(Object.getPrototypeOf(response)), response);
		copy.correlationId = correlationId;
		return copy;
	}

	async _initializeBuild(correlationId) {
		try {
			const response = this._initResponse(correlationId);
			response.results = {};

			const responsePlans = await this._servicePlans.listing(correlationId);
			if (this._hasFailed(responsePlans))
				return this._initializeFailed(correlationId, responsePlans);

			response.results.plans = responsePlans.results;

			const responseVersion = await this._serviceVersion.version(correlationId);
			if (this._hasFailed(responseVersion))
				return this._initializeFailed(correlationId, responseVersion);

			response.results.version = responseVersion.results;

			await this._intialize(correlationId, response);

			this._ttlInitialize = LibraryMomentUtility.getTimestamp();
			this._initializeResponse = response;
			return response;
		}
		catch (err) {
			return this._initializeFailed(correlationId, this._error('UtilityService', 'initialize', null, err, null, null, correlationId));
		}
	}

	_initializeExpired() {
		const ttlInitialize = this._ttlInitialize ? this._ttlInitialize : 0;
		return (LibraryMomentUtility.getTimestamp() - ttlInitialize) > this._ttlInitializeDiff;
	}

	// A refresh that fails leaves the last good response in service and pushes
	// the next attempt out by one TTL, so a struggling backend is not asked again
	// on every call. With nothing cached the failure goes back to the callers.
	_initializeFailed(correlationId, response) {
		if (this._initializeResponse) {
			this._ttlInitialize = LibraryMomentUtility.getTimestamp();
			this._logger.warn('UtilityService', 'initialize', 'Refresh failed; serving the previous response.', response, correlationId);
		}
		return response;
	}

	// One build at a time; concurrent callers share the one in flight. Never
	// rejects, so the background caller can drop the promise.
	_initializeRefresh(correlationId) {
		if (this._initializePending)
			return this._initializePending;

		this._initializePending = this._initializeBuild(correlationId)
			.finally(() => {
				this._initializePending = null;
			});
		return this._initializePending;
	}

	_initLoggerClient() {
		const defaults = UtilityService.loggerClientDefaults();
		const config = (this._config ? this._config.get('logging.client', null) : null) ?? {};
		const read = (key) => Number.isFinite(Number(config[key])) && (config[key] !== null) && (config[key] !== '') ? Number(config[key]) : defaults[key];
		this._loggerClient = {
			maxMessageLength: read('maxMessageLength'),
			maxDataLength: read('maxDataLength'),
			maxPerSecond: read('maxPerSecond')
		};
	}

	_loggerClientAllowed(correlationId) {
		const max = this._loggerClient.maxPerSecond;
		if (!(max > 0))
			return true;

		const window = Math.floor(Date.now() / 1000);
		if (window !== this._loggerClientWindow) {
			if (this._loggerClientDropped > 0)
				this._logger.warn('UtilityService', 'logger', `Dropped ${this._loggerClientDropped} client log entries over the limit of ${max} per second.`, null, correlationId);
			this._loggerClientWindow = window;
			this._loggerClientCount = 0;
			this._loggerClientDropped = 0;
		}

		if (this._loggerClientCount >= max) {
			this._loggerClientDropped++;
			return false;
		}

		this._loggerClientCount++;
		return true;
	}

	_loggerClientData(data) {
		if ((data === null) || (data === undefined))
			return data;

		const max = this._loggerClient.maxDataLength;
		if (!(max > 0))
			return data;

		if (typeof data === 'string')
			return this._loggerClientTruncate(data, max);

		let json;
		try {
			json = JSON.stringify(data);
		}
		catch {
			return '[unserializable]';
		}
		if ((json === undefined) || (json.length <= max))
			return data;

		return { truncated: true, length: json.length, preview: json.substring(0, max) };
	}

	_loggerClientTruncate(value, max) {
		if ((value === null) || (value === undefined))
			return value;

		const text = (typeof value === 'string') ? value : String(value);
		if (!(max > 0) || (text.length <= max))
			return text;

		return text.substring(0, max) + `... [truncated, ${text.length} characters]`;
	}
	
	async openSource(correlationId) {
		return this._openSourceResponse ? this._openSourceResponse : this._error('UtilityService', 'openSource', null, null, null, null, correlationId);
	}

	_intialize(correlationId, response) {
	}

	// Where the open source lists are looked for, and how one is loaded. Both are
	// separate so they can be pointed elsewhere.
	_openSourceDir() {
		return path.join(path.resolve(), 'node_modules', '@thzero');
	}

	async _openSourceImport(importPath) {
		return await import(importPath);
	}

	async _initializeOopenSource(correlationId) {
		this._openSourceResponse = this._initResponse(correlationId);
		this._openSourceResponse.results = [];

		try {
			const dir = this._openSourceDir();
			const dirs = await fs.promises.readdir(dir);

			console.log();
			console.log('\t----open.source.initialization-----------------');

			// Every package is looked at together rather than one after another, and
			// the existence check is async rather than a blocking stat. Promise.all
			// keeps the order of dirs, so the result is the same as the serial loop.
			const lists = await Promise.all(dirs.map(async (item) => {
				const file = path.join(dir, item, 'openSource.js');
				console.log(`\t${file}...`);
				try {
					await fs.promises.access(file);
				}
				catch {
					console.log(`\t...not found.`);
					return null;
				}

				try {
					const importPath = ['@thzero', item, 'openSource.js'].join('/');
					console.log(`\t\t${importPath}...`);
					const fileI = await this._openSourceImport(importPath);
					if (!fileI || !fileI.default) {
						console.log(`\t...failed to load.`);
						return null;
					}

					console.log(`\t...processed.`);
					return fileI.default();
				}
				catch(err) {
					console.log(`\t...failed.`, err);
					this._logger.warn('UtilityService', '_initializeOopenSource', null, err, correlationId);
					return null;
				}
			}));

			// A Set of names, not a scan of the results for each entry.
			const names = new Set();
			for (const items of lists) {
				if (!items)
					continue;
				for (const element of items) {
					if (element.category !== 'server')
						continue;
					if (names.has(element.name))
						continue;
					names.add(element.name);
					this._openSourceResponse.results.push(element);
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
