const LibraryConstants = {
	InjectorKeys: {
		CONFIG: 'config',
		REPOSITORY_ADMIN_NEWS: 'repositoryAdminNews',
		REPOSITORY_ADMIN_USERS: 'repositoryAdminUsers',
		REPOSITORY_NEWS: 'repositoryNews',
		REPOSITORY_PLANS: 'repositoryPlans',
		REPOSITORY_USAGE_METRIC: 'repositoryUsageMetrics',
		REPOSITORY_USERS: 'repositoryUsers',
		SERVICE_ADMIN_NEWS: 'serviceAdminNews',
		SERVICE_ADMIN_USERS: 'serviceAdminUsers',
		SERVICE_AUTH: 'serviceAuth',
		SERVICE_CRYPTO: 'serviceCrypto',
		SERVICE_LOGGER: 'serviceLogger',
		SERVICE_NEWS: 'serviceNews',
		SERVICE_PLANS: 'servicePlans',
		SERVICE_SECURITY: 'serviceSecurity',
		SERVICE_USAGE_METRIC: 'serviceUsageMetric',
		SERVICE_USERS: 'serviceUser',
		SERVICE_UTILITY: 'serviceUtility',
		SERVICE_VALIDATION: 'serviceValidation',
		SERVICE_VALIDATION_NEWS: 'serviceNewsValidation',
		SERVICE_VERSION: 'serviceVersion'
	},
	ErrorCodes: {
		InvalidObject: 'invalidObject',
		InvalidPermissions: 'invalidPermissions',
		ObjectChanged: 'objectChanged',
		QuotaReached: 'quotaExceeded'
	},
	ErrorFields: {
		Generic: 'generic',
		Name: 'name',
		Number: 'number',
		Order: 'order'
	},
	Headers: {
		AuthKeys: {
			API: 'x-api-key',
			AUTH: 'Authorization',
			AUTH_BEARER: 'Bearer'
		},
		CorrelationId: 'CorrelationId'
	},
	NewsStatus: {
		ACTIVE: 'active',
		DISABLED: 'disabled'
	},
	NewsTypes: {
		MAIN: 'main'
	}
}

export default LibraryConstants;
