import fs from 'fs';
import path from 'path';

import Service from './index.js';

class VersionService extends Service {
	async version(correlationId) {
		try {
			const filePath = path.join(process.cwd(), 'package.json');
			const file = fs.readFileSync(filePath, 'utf8');
			if (String.isNullOrEmpty(file))
				throw Error('Invalid package.json file for versioning; expected in the <app root> folder.');
	
			const packageObj = JSON.parse(file);
			if (!packageObj)
				throw Error('Invalid package.json file for versioning.');
	
			return this._generate(correlationId, packageObj.version_major, packageObj.version_minor, packageObj.version_patch, packageObj.version_date);
		}
		catch (err) {
			return this._error('VersionService', 'version', null, err, null, null, correlationId);
		}
	}

	_generate(correlationId, version_major, version_minor, version_patch, version_date) {
		const response = this._success(correlationId);
		response.results = {
			major: version_major,
			minor: version_minor,
			patch: version_patch,
			date: version_date
		};
		return response;
	}
}

export default VersionService;
