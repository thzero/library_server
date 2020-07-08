class TokenExpiredError extends Error {
	constructor() {
		super('Token Expired.');
	}
}

export default TokenExpiredError;
