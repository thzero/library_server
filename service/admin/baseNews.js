import LibraryConstants from '../../constants';

import BaseAdminService from './index';

import NotImplementedError from '../../errors/notImplemented';

class BaseNewsAdminService extends BaseAdminService {
	constructor() {
		super();

		this._serviceValidationNews = null;
	}

	init(injector) {
		super.init(injector);

		this._serviceValidationNews = this._injector.getService(LibraryConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);
	}

	_initializeData() {
		throw new NotImplementedError();
	}

	get _repository() {
		return this._injector.getService(LibraryConstants.InjectorKeys.REPOSITORY_ADMIN_NEWS);
	}

	get _validationCreateSchema() {
		return this._serviceValidationNews.getNewsSchema();
	}

	get _validationUpdateSchema() {
		return this._serviceValidationNews.getNewsUpdateSchema();
	}

	get _validationCheckKey() {
		return 'adminNews';
	}
}

export default BaseNewsAdminService;
