import crypto from 'crypto';

import Service from './index';

const encoder = new TextEncoder();

class CryptoService extends Service {
	async checksum(input, algorithm, encoding) {
		return crypto
			.createHash(algorithm || 'sha256')
			.update(encoder.encode(input), 'utf8')
			.digest(encoding || 'hex');
	}
}

export default CryptoService;
