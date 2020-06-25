import Response from './index';

class ExtractResponse extends Response {
	constructor() {
		super();

		this.count = 0;
		this.total = 0;
		this.data = null;
	}
}

export default ExtractResponse;
