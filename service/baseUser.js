import Service from './index.js';

import NotImplementedError from '@thzero/library_common/errors/notImplemented.js';

class BaseUserService extends Service {
	async fetch(correlationId, userId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalIdSchema, userId);
		if (this._hasFailed(validationCheckExternalIdResponse))
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.fetch(correlationId, userId);
		return respositoryResponse;
	}

	async fetchByExternalId(correlationId, externalUserId) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalIdSchema, externalUserId);
		if (this._hasFailed(validationCheckExternalIdResponse))
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUserId);
		return respositoryResponse;
	}

	async fetchByGamerId(correlationId, requestedGamerId) {
		const validationRequestedGamerIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.gamerIdSchema, requestedGamerId);
		if (this._hasFailed(validationRequestedGamerIdResponse))
			return validationRequestedGamerIdResponse;

		const respositoryResponse = await this._repositoryUser.fetchByGamerId(correlationId, requestedGamerId);
		return respositoryResponse;
	}

	async fetchByGamerTag(correlationId, requestedUserGamerTag) {
		const validationRequestedGamerTagResponse = this._serviceValidation.check(correlationId, this._serviceValidation.gamerTagSchema, requestedUserGamerTag);
		if (this._hasFailed(validationRequestedGamerTagResponse))
			return validationRequestedGamerTagResponse;

		const respositoryResponse = await this._repositoryUser.fetchByGamerTag(correlationId, requestedUserGamerTag);
		return respositoryResponse;
	}

	async refreshSettings(correlationId, params) {
		const validationCheckExternalIdResponse = this._serviceValidation.check(correlationId, this._serviceValidation.settingsRefreshSchema, params);
		if (this._hasFailed(validationCheckExternalIdResponse))
			return validationCheckExternalIdResponse;

		const respositoryResponse = await this._repositoryUser.refreshSettings(correlationId, params.userId);
		return respositoryResponse;
	}

	async update(correlationId, externalUser) {
		const validationCheckExternalUserResponse = this._serviceValidation.check(correlationId, this._serviceValidation.externalUserSchema, externalUser);
		if (this._hasFailed(validationCheckExternalUserResponse))
			return validationCheckExternalUserResponse;

		const respositoryResponse = await this._repositoryUser.fetchByExternalId(correlationId, externalUser.id, true);
		if (this._hasFailed(respositoryResponse))
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
		if (externalUser) {
			if (String.isNullOrEmpty(user.email)) {
				if (!String.isNullOrEmpty(externalUser.email)) {
					user.email = externalUser.email;
				}
			}
		}

		const respositoryExternalResponse = await this._repositoryUser.updateFromExternal(correlationId, user.id, user);
		return respositoryExternalResponse;
	}

	async updateSettings(correlationId, requestedSettings) {
		const validationCheckSettingsResponse = this._serviceValidation.check(correlationId, this._serviceValidation.settingRequestSchema(), requestedSettings);
		if (this._hasFailed(validationCheckSettingsResponse))
			return validationCheckSettingsResponse;

		const validationSettingsResponse = await this._updateSettingsValidation(correlationId, requestedSettings);
		if (this._hasFailed(validationSettingsResponse))
			return validationSettingsResponse;

		const updateSettingsResponse = await this._updateSettings(correlationId, requestedSettings);
		if (this._hasFailed(updateSettingsResponse))
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
