import Service from './index';

import NotImplementedError from '@thzero/library_common/errors/notImplemented';

class BaseUserService extends Service {
	async fetch(correlationId, userId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalIdSchema, userId);
		if (!validationCheckExternalIdResponse.success)
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.fetch(correlationId, userId);
		return respositoryResponse;
	}

	async fetchByExternalId(correlationId, externalUserId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalIdSchema, externalUserId);
		if (!validationCheckExternalIdResponse.success)
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUserId);
		return respositoryResponse;
	}

	async fetchByGamerId(correlationId, requestedGamerId) {
		const validationRequestedGamerIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.gamerIdSchema, requestedGamerId);
		if (!validationRequestedGamerIdResponse.success)
			return validationRequestedGamerIdResponse;

		const respositoryResponse = await this._repositoryUser.fetchByGamerId(correlationId, requestedGamerId);
		return respositoryResponse;
	}

	async fetchByGamerTag(correlationId, requestedUserGamerTag) {
		const validationRequestedGamerTagResponse = this._serviceValidation.check(correlationId, this._serviceValidation.gamerTagSchema, requestedUserGamerTag);
		if (!validationRequestedGamerTagResponse.success)
			return validationRequestedGamerTagResponse;

		const respositoryResponse = await this._repositoryUser.fetchByGamerTag(correlationId, requestedUserGamerTag);
		return respositoryResponse;
	}

	async refreshSettings(correlationId, params) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.settingsRefreshSchema, params);
		if (!validationCheckExternalIdResponse.success)
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.refreshSettings(correlationId, params.userId);
		return respositoryResponse;
	}

	async update(correlationId, externalUser) {
		const validationCheckExternalUserResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalUserSchema, externalUser);
		if (!validationCheckExternalUserResponse.success)
			return validationCheckExternalUserResponse;

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUser.id, true);
		if (!respositoryResponse)
			return respositoryResponse;

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
		return respositoryResponse;
	}

	async updateSettings(correlationId, requestedSettings) {
		const validationCheckSettingsResponse = this._serviceValidation.check(correlationId, this._serviceValidation.settingRequestSchema(), requestedSettings);
		if (!validationCheckSettingsResponse.success)
			return validationCheckSettingsResponse;

		const validationSettingsResponse = await this._updateSettingsValidation(correlationId, requestedSettings);
		if (!validationSettingsResponse.success)
			return validationSettingsResponse;

		const updateSettingsResponse = await this._updateSettings(correlationId, requestedSettings);
		if (!updateSettingsResponse.success)
			return updateSettingsResponse;

		const respositoryResponse = await this._repositoryUser.updateSettings(correlationId, requestedSettings.userId, requestedSettings.settings);
		return respositoryResponse;
	}

	_updateSettings(correlationId, requestedSettings) {
		return this._success(correlationId);
	}

	_updateSettingsValidation(correlationId, requestedSettings) {
		return this._success(correlationId);
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
