class TokenExpiredError extends Error {
	constructor() {
		super('Token Expired.');

		this.statusCode = 401;
		this.code = 'TOKEN_EXPIRED';
	}
}

export default TokenExpiredError;
