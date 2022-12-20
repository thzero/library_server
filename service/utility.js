import fs from 'fs';
import path from 'path';

import LibraryConstants from '@thzero/library_server/constants.js';

import Service from './index.js';

class UtilityService extends Service {
	constructor() {
		super();

		this._servicePlans = null;
		this._serviceVersion = null;

		this._openSourceResponse = null;
	}

	async init(injector) {
		await super.init(injector);

		this._servicePlans = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_PLANS);
		this._serviceVersion = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VERSION);

		await this._initializeOopenSource();
	}

	async initialize(correlationId) {
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

		this._intialize(correlationId, response);

		return response;
	}

	async logger(content, correlationId) {
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
	
			console.log(`\tOpenSource...`);
			
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
					console.log(`\t${importPath}...`);
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
			console.log(`\t...OpenSource`);
		}

		// response.results = await this._openSourceServer(correlationId);
		this._openSource(correlationId, this._openSourceResponse.results);

		this._openSourceResponse.results = this._openSourceResponse.results.sort((a, b) => a.name.localeCompare(b.name));
	}

	_openSource(correlationId, openSource) {
	}

	// async _openSourceServer(correlationId) {
	// 	return [
	// 		{
	// 			category: 'server',
	// 			name: '@thzero/library_common',
	// 			url: 'https://github.com/thzero/library_common',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/thzero/library_common/blob/master/license.md'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: '@thzero/library_common_service',
	// 			url: 'https://github.com/thzero/library_common_service',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/thzero/library_common_service/blob/master/license.md'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: '@thzero/library_server',
	// 			url: 'https://github.com/thzero/library_server',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/thzero/library_server/blob/master/license.md'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'async-mutex',
	// 			url: 'https://github.com/DirtyHairy/async-mutex',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/DirtyHairy/async-mutex/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'config',
	// 			url: 'https://github.com/lorenwest/node-config',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/lorenwest/node-config/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'dayjs',
	// 			url: 'https://github.com/iamkun/dayjs',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/iamkun/dayjs/blob/dev/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'dayjs-plugin-utc',
	// 			url: 'https://github.com/guisturdy/dayjs-plugin-utc',
	// 			licenseName: '??',
	// 			licenseUrl: ''
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'easy-rbac',
	// 			url: 'https://github.com/DeadAlready/easy-rbac',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/DeadAlready/easy-rbac/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'ipaddr.js',
	// 			url: 'https://github.com/whitequark/ipaddr.js',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/whitequark/ipaddr.js/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'client',
	// 			name: 'lodash',
	// 			url: 'https://github.com/lodash/lodash',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/lodash/lodash/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'terminus',
	// 			url: 'https://github.com/godaddy/terminus',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/godaddy/terminus/blob/master/LICENSE'
	// 		},
	// 		{
	// 			category: 'server',
	// 			name: 'uuid',
	// 			url: 'https://github.com/kelektiv/node-uuid',
	// 			licenseName: 'MIT',
	// 			licenseUrl: 'https://github.com/kelektiv/node-uuid/blob/master/LICENSE.md'
	// 		}
	// 	];
	// }
}

export default UtilityService;
