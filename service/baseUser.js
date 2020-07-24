import Service from './index';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

class BaseUserService extends Service {
	async fetch(correlationId, userId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(this._serviceValidation.externalIdSchema, userId);
		if (!validationCheckExternalIdResponse.success)
			return this._errorResponse(validationCheckExternalIdResponse);

		const respositoryResponse = await this._repositoryUser.fetch(correlationId, userId);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async fetchByExternalId(correlationId, externalUserId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(this._serviceValidation.externalIdSchema, externalUserId);
		if (!validationCheckExternalIdResponse.success)
			return this._errorResponse(validationCheckExternalIdResponse);

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUserId);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async fetchByGamerId(correlationId, requestedGamerId) {
		const validationRequestedGamerIdResponse = this._serviceValidation.check(this._serviceValidation.gamerIdSchema, requestedGamerId);
		if (!validationRequestedGamerIdResponse.success)
			return this._errorResponse(validationRequestedGamerIdResponse);

		const respositoryResponse = await this._repositoryUser.fetchByGamerId(correlationId, requestedGamerId);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async fetchByGamerTag(correlationId, requestedUserGamerTag) {
		const validationRequestedGamerTagResponse = this._serviceValidation.check(this._serviceValidation.gamerTagSchema, requestedUserGamerTag);
		if (!validationRequestedGamerTagResponse.success)
			return this._errorResponse(validationRequestedGamerTagResponse);

		const respositoryResponse = await this._repositoryUser.fetchByGamerTag(correlationId, requestedUserGamerTag);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	async update(correlationId, externalUser) {
		const validationCheckExternalUserResponse = this._serviceValidation.check(this._serviceValidation.externalUserSchema, externalUser);
		if (!validationCheckExternalUserResponse.success)
			return this._errorResponse(validationCheckExternalUserResponse);

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUser.id, true);
		if (!respositoryResponse)
			return this._errorResponse(respositoryResponse);

		let user = respositoryResponse.results;
		if (!user) {
			user = this._initiateUser();
			user.id = externalUser.id;
			user.planId = this._getDefaultPlan();
			user.roles.push(this._getDefaultUserRole());
			this._initializeUser(user);
		}
		user.external = externalUser;

		const respositoryExternalResponse = await this._repositoryUser.updateFromExternal(correlationId, user.id, user);
		if (!respositoryExternalResponse.success)
			return this._errorResponse(respositoryExternalResponse);

		return this._initResponse(respositoryResponse);
	}

	async updateSettings(correlationId, requestedSettings) {
		const validationCheckSettingsResponse = this._serviceValidation.check(this._serviceValidation.settingRequestSchema(), requestedSettings);
		if (!validationCheckSettingsResponse.success)
			return this._errorResponse(validationCheckSettingsResponse);

		const validationSettingsResponse = await this._updateSettingsValidation(correlationId, requestedSettings);
		if (!validationSettingsResponse.success)
			return this._errorResponse(validationSettingsResponse);

		const updateSettingsResponse = await this._updateSettings(requestedSettings);
		if (!updateSettingsResponse.success)
			return this._errorResponse(updateSettingsResponse);

		const respositoryResponse = await this._repositoryUser.updateSettings(correlationId, requestedSettings.userId, requestedSettings.settings);
		if (!respositoryResponse.success)
			return this._errorResponse(respositoryResponse);

		return this._initResponse(respositoryResponse);
	}

	_updateSettings(requestedSettings) {
		return this._success();
	}

	_updateSettingsValidation(correlationId, requestedSettings) {
		return this._success();
	}

	_getDefaultPlan() {
		return new NotImplementedError();
	}

	_getDefaultUserRole() {
		return new NotImplementedError();
	}

	_initializeUser(user) {
	}

	get _repositoryUser() {
		return new NotImplementedError();
	}
}

export default BaseUserService;
