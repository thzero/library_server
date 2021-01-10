const LibraryConstants = {
	InjectorKeys: {
		REPOSITORY_ADMIN_NEWS: 'repositoryAdminNews',
		REPOSITORY_ADMIN_USERS: 'repositoryAdminUsers',
		REPOSITORY_NEWS: 'repositoryNews',
		REPOSITORY_PLANS: 'repositoryPlans',
		REPOSITORY_USAGE_METRIC: 'repositoryUsageMetrics',
		REPOSITORY_USERS: 'repositoryUsers',
		SERVICE_ADMIN_NEWS: 'serviceAdminNews',
		SERVICE_ADMIN_USERS: 'serviceAdminUsers',
		SERVICE_AUTH: 'serviceAuth',
		SERVICE_COMMUNICATION_REST: 'serviceCommunicationRest',
		SERVICE_CRYPTO: 'serviceCrypto',
		SERVICE_DISCOVERY_MDNS: 'serviceMdns',
		SERVICE_DISCOVERY_RESOURCES: 'serviceDiscoveryResources',
		SERVICE_NEWS: 'serviceNews',
		SERVICE_PLANS: 'servicePlans',
		SERVICE_SECURITY: 'serviceSecurity',
		SERVICE_USAGE_METRIC: 'serviceUsageMetric',
		SERVICE_USERS: 'serviceUser',
		SERVICE_UTILITY: 'serviceUtility',
		SERVICE_VALIDATION_NEWS: 'serviceNewsValidation',
		SERVICE_VERSION: 'serviceVersion'
	},
	HealthCheck: {
		DefaultPath: '/healthcheck'
	},
	Headers: {
		AuthKeys: {
			API: 'x-api-key',
			AUTH: 'authorization',
			AUTH_BEARER: 'bearer'
		},
		CorrelationId: 'correlation-id'
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
