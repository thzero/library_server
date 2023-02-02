import LibraryServerConstants from '../../constants.js';

import BaseAdminService from './index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

class BaseNewsAdminService extends BaseAdminService {
	constructor() {
		super();

		this._repositoryNews = null;

		this._serviceValidationNews = null;
	}

	async init(injector) {
		await super.init(injector);

		this._repositoryNews = this._injector.getService(LibraryServerConstants.InjectorKeys.REPOSITORY_ADMIN_NEWS);

		this._serviceValidationNews = this._injector.getService(LibraryServerConstants.InjectorKeys.SERVICE_VALIDATION_NEWS);
	}

	_initializeData() {
		throw new NotImplementedError();
	}

	get _repository() {
		return this._repositoryNews;
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
