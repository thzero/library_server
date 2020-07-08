import crypto from 'crypto';

const encoder = new TextEncoder();

class CryptoUtility {
	static async checksum(input, algorithm, encoding) {
		return crypto
			.createHash(algorithm || 'sha256')
			.update(encoder.encode(input), 'utf8')
			.digest(encoding || 'hex');
	}
}

export default CryptoUtility;
