import Service from '../index';

class BaseValidationService extends Service {
	check(schema, value, context, prefix) {
		return this._success();
	}
}

export default BaseValidationService;
