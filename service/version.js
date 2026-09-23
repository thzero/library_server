import fs from 'fs';
import path from 'path';

import Service from './index.js';

class VersionService extends Service {
	constructor() {
		super();

		this._versionResults = null;
	}

	// package.json cannot change while the process runs, so it is read once, here,
	// off the request path. It used to be a synchronous read on the first request.
	// A problem with the file is logged rather than thrown, and reported by
	// version() per call, as it was before.
	async init(injector) {
		await super.init(injector);

		try {
			await this._load();
		}
		catch (err) {
			this._logger.warn('VersionService', 'init', null, err, null);
		}
	}

	async version(correlationId) {
		try {
			if (!this._versionResults)
				await this._load();

			const response = this._success(correlationId);
			response.results = this._versionResults;
			return response;
		}
		catch (err) {
			return this._error('VersionService', 'version', null, err, null, null, correlationId);
		}
	}

	async _load() {
		const file = await fs.promises.readFile(this._packagePath(), 'utf8');
		if (String.isNullOrEmpty(file))
			throw Error('Invalid package.json file for versioning; expected in the <app root> folder.');

		const packageObj = JSON.parse(file);
		if (!packageObj)
			throw Error('Invalid package.json file for versioning.');

		this._versionResults = {
			major: packageObj.version_major,
			minor: packageObj.version_minor,
			patch: packageObj.version_patch,
			date: packageObj.version_date
		};
	}

	_packagePath() {
		return path.join(process.cwd(), 'package.json');
	}
}

export default VersionService;
