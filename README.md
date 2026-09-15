![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_server)
![David](https://img.shields.io/david/thzero/library_server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_server

An opinionated library of common functionality to bootstrap an API application using MongoDb and Firebase.  Currently either Fastify or Koa can be used as the web server; Fastify will be the focus going forward due to lack of support and updates with the Koa stack.

## Requirements

### NodeJs

Requires [NodeJs ](https://nodejs.org) version 22+.

### NodeMon

```
npm -g i nodemon
```

### Installation

[![NPM](https://nodei.co/npm/@thzero/library_server.png?compact=true)](https://npmjs.org/package/@thzero/library_server)

#### NPM Dependencies

Install the NPM dependencies for the server.

```
npm install
```

#### Mongo

Mongo is the only currently supposed option as the server side data source.

* Install the MongoDb (either locally or in the cloud) server
  * Recommendation is MongoDb Atlas (https://www.mongodb.com/cloud/atlas) for development/sandbox
* Create a new MongoDb database in the Mongo server
* Restore the default SocietySidekick MongoDb
  * Use the following MongoDb CLI tool to restore the default database located at (https://github.com/thzero/societySidekick-database)

```
.\bin\mongorestore --host <mongodb host name> --ssl --username <mongo user name> --password <mongo user password> --authenticationDatabase admin -d production <location of default database>
```

Recommended tools for managing Mongo database
* MongoDb Compass (https://www.mongodb.com/products/compass)
* Robo3T (https://robomongo.org)

#### Firebase

Google Firebase (https://firebase.google.com) provides the social based authentication; currently only Google social accounts are supported.

* Add a new project
* Setup **Authentication**, enabled Google in the **Sign-in method**.
* Get the Firebase SDK configuration
  * Go to Project Overview->Settings->Service accounts
  * Select **Node.js** option
  * Click **Generate new private key**

#### ServiceAccountKey.json

* Copy the contents of the file that was downloaded when generating a new private key into the 'config\ServiceAccountKey.json' file.

#### Configuration

The following setup for configuration is required for an application using this library_server dependency

* Setup the configuration found in the config\development.json
  * Note that this is ignored in the .gitignore
* Configuration looks like the following

```
{
    "app": {
        "auth": {
          "apiKey": "<generate a GUID as key in standard nomeclature '#######-####-####-####-############'>",
          "claims": {
            "check": <true of false, false by default>,
            "useDefault": <true of false, false by default>
          }
        },
        "cors": {
            "origin": "*"
        },
        "db": {
            "default": "mongo"
            "mongo": {
                "connection": "<mongo connection string>",
                "name": "<environment name>"
            }
        },
        "logging": {
            "level": <see https://github.com/pinojs/pino/issues/123 for logging levels>,
            "prettify": <true of false if you want prettify, if true requres 'pino-prettify' as a dependency>
        },
        "port": <port to run the server on>
    }
}
```

##### Environment Variable overrides

The following environmnent variables override the above configuration settings found in the config file.

* AUTH_API_KEY
* AUTH_CLAIMS_CHECK
* AUTH_CLAIMS_USE_DEFAULT
* CORS_ORIGIN
* DB_DEFAULT
* DB_CONNECTION_ATLAS
* DB_NAME_ATLAS
* DB_CONNECTION_MONGO
* DB_NAME_MONGO
* IP_ADDRESS
* LOGGING_LEVEL
* LOGGING_PRETTIFY
* PORT

##### Development Tool Configuration

* Include the following in the package.json for the application.

```
  "version_major": #,
  "version_minor": #,
  "version_patch": #,
  "version_date": "MM/DD/YYYY",
```

## Architecture

### Boot

`BootMain` (`boot/index.js`) owns application startup: it builds the injector, registers the framework's services and repositories, initialises the loggers, resolves routes from the boot plugins it is handed, starts the server, registers with service discovery, and wires shutdown through [terminus](https://github.com/godaddy/terminus).

An application subclasses the web-server-specific `BootMain` — `@thzero/library_server_fastify/boot/index.js` — and calls `start` with its boot plugins:

```js
(async function() {
    await (new AppBootMain()).start(ApiPlugin, NewsApiPlugin, UsersApiPlugin);
})();
```

Every extension point is a `_init*` method to override. The ones an application reaches for most:

| Method | Purpose |
|---|---|
| `_initServices()` / `_initServicesSecondary()` | Register application services. `Secondary` runs after the first pass, for services that depend on others |
| `_initRepositories()` | Register application repositories |
| `_initServicesLoggers()` | Register one or more logger services via `_registerServicesLogger(key, service)` |
| `_initServicesUsageMetrics()`, `_initRepositoriesUsageMetrics()` | Swap the usage-metrics implementation |
| `_initServicesMonitoring()`, `_initServicesDiscoveryResources()`, `_initServicesDiscoveryMdns()` | Opt into monitoring and discovery |
| `_initIdGenerator()`, `_initIdGeneratorAlphabet()`, `_initIdGeneratorLengthLong()`, `_initIdGeneratorLengthShort()` | Control generated ids |
| `_initServerStart(injector)` | Last call before serving, once everything is resolvable |
| `_initCleanup(cleanupFuncs)` | Register shutdown work |
| `_injectService(key, service)`, `_injectRepository(key, repository)` | Register a single thing with the injector |

### Boot plugins

A boot plugin groups the routes, repositories and services for one concern. `BootPlugin` (`boot/plugins/index.js`) declares `init`, `initRoutes`, `initRepositories`, `initServices` and `initServicesSecondary`; the package ships plugins for the framework's own concerns — `api`, `apiFront`, `news`, `users`, `usersExtended`, and the `admin` family.

### Injector

`utility/injector.js` is the service locator everything resolves through: `addService`, `addSingleton`, `getService`, `getServices`, `getSingletons`. Keys are string constants, split across two packages.

From `@thzero/library_server/constants.js`:

| Constant | Key |
|---|---|
| `SERVICE_AUTH` | `serviceAuth` |
| `SERVICE_SECURITY` | `serviceSecurity` |
| `SERVICE_USERS` | `serviceUser` |
| `SERVICE_COMMUNICATION_REST` | `serviceCommunicationRest` |
| `SERVICE_USAGE_METRIC` | `serviceUsageMetric` |
| `SERVICE_UTILITY` | `serviceUtility` |
| `SERVICE_VERSION` | `serviceVersion` |
| `SERVICE_PLANS` | `servicePlans` |
| `SERVICE_NEWS` | `serviceNews` |
| `SERVICE_CRYPTO` | `serviceCrypto` |
| `SERVICE_DISCOVERY_RESOURCES` | `serviceDiscoveryResources` |
| `SERVICE_DISCOVERY_MDNS` | `serviceMdns` |
| `SERVICE_ADMIN_NEWS`, `SERVICE_ADMIN_USERS` | `serviceAdmin…` |
| `SERVICE_VALIDATION_NEWS` | `serviceNewsValidation` |
| `REPOSITORY_USERS`, `REPOSITORY_PLANS`, `REPOSITORY_NEWS`, `REPOSITORY_USAGE_METRIC` | `repository…` |
| `REPOSITORY_ADMIN_NEWS`, `REPOSITORY_ADMIN_USERS` | `repositoryAdmin…` |

From `@thzero/library_common_service/constants.js` — the three every `Service` and `Repository` resolves for itself during `init`:

| Constant | Key |
|---|---|
| `SERVICE_CONFIG` | `serviceConfig` |
| `SERVICE_LOGGER` | `serviceLogger` |
| `SERVICE_VALIDATION` | `serviceValidation` |

Satellite packages add their own — `SERVICE_REPOSITORY_COLLECTIONS` in `@thzero/library_server_repository_mongo/constants.js`, for one.

### Services

| File | Class | Purpose |
|---|---|---|
| `service/baseSecurity.js` | `BaseSecurityService` | Role and claims authorization on top of [easy-rbac](https://github.com/DeadAlready/easy-rbac). `authorizationCheckRoles`, `authorizationCheckClaims`, and an abstract `validate` |
| `service/baseUser.js` | `BaseUserService` | Users — fetch by id, external id, gamer id or tag; settings; `update` as create-or-update from the identity provider |
| `service/config.js` | `ServerConfigService` | Configuration, including `getBackend(correlationId, key)` for per-backend blocks |
| `service/crypto.js` | `CryptoService` | `checksum` |
| `service/usageMetrics.js` | `UsageMetricsService` | `register` per response, `tag` for explicit events, `listing`, and `registerIgnore(url)` to exempt high-volume paths |
| `service/utility.js` | `UtilityService` | `initialize` for the client bootstrap payload, `logger` for relayed client logs, `openSource` for attribution |
| `service/version.js` | `VersionService` | `version` |
| `service/plans.js` | `PlansService` | `listing` |
| `service/news/base.js` | `BaseNewsService` | `latest` |
| `service/admin/index.js` | `BaseAdminService` | Admin CRUD — `create`, `delete`, `search`, `update` |
| `service/restCommunication.js` | `RestCommunicationService` | **Abstract.** Implemented by `@thzero/library_server_service_rest_axios` |
| `service/monitoring.js` | `NullMonitoringService` | The no-op default |

### Repositories

`repository/index.js` — `Repository`, the base every repository extends. It carries the enforcement and response helpers:

* `_enforce`, `_enforceNotNull`, `_enforceNotEmpty`, and the `Either` / `Multiple` / `Response` variants — **these throw**, so use them for invariants, not for user input.
* `_error`, `_warn`, `_success`, `_successResponse`, `_errorResponse` — build the response envelope.
* `_hasFailed`, `_hasSucceeded` — test a response. A `Response` object is always truthy, so never test one with `if (!response)`.
* `_initResponse`, `_initResponseExtract`.

A concrete data store comes from a satellite package — `@thzero/library_server_repository_mongo` or `@thzero/library_server_repository_redis`.

### Routes

`routes/index.js` — `BaseRoute`, with `id`, `router` and `init`. The web-server-specific subclass lives in `@thzero/library_server_fastify`.

### Utilities

`utility/injector.js`, `utility/os.js`, `utility/internalIp/`, and the list structures in `utility/list/` — `DoubleLinkedList` and `PriorityQueue` as classes, plus a vendored CC0 `Queue` constructor function.

## Conventions

Two are worth knowing before writing against this library:

**`correlationId` comes first.** Almost every method takes it as its first parameter, and it flows from the inbound request through every service, repository and outbound call, so one request can be traced end to end. The logger and `_enforce*`/`_error` families are the deviation — they take it **last**, after `(clazz, method, …)`.

**Everything returns a `Response`.** Success and failure both come back as an object with `success`, `results`, `message`, `err`, `errors` and `correlationId`. It is always truthy — test it with `_hasFailed` / `_hasSucceeded`.

## Related packages

| Package | Provides |
|---|---|
| [library_server_fastify](https://github.com/thzero/library_server_fastify) | The Fastify web layer — boot, middleware, plugins, routes |
| [library_server_firebase](https://github.com/thzero/library_server_firebase) | `SERVICE_AUTH` via Firebase, and Cloud Messaging |
| [library_server_repository_mongo](https://github.com/thzero/library_server_repository_mongo) | MongoDB repositories |
| [library_server_repository_redis](https://github.com/thzero/library_server_repository_redis) | The Redis repository base |
| [library_server_repository_redis_ioredis](https://github.com/thzero/library_server_repository_redis_ioredis) | ioredis binding for the above |
| [library_server_validation_joi](https://github.com/thzero/library_server_validation_joi) | `SERVICE_VALIDATION` via Joi |
| [library_server_logger_pino](https://github.com/thzero/library_server_logger_pino) | pino logging |
| [library_server_logger_winston](https://github.com/thzero/library_server_logger_winston) | winston logging, with syslog |
| [library_server_service_rest_axios](https://github.com/thzero/library_server_service_rest_axios) | Outbound REST via axios |
| [library_server_service_grpc](https://github.com/thzero/library_server_service_grpc) | gRPC client and server bases |
| [library_server_messaging_slack](https://github.com/thzero/library_server_messaging_slack) | Slack notifications |

## Development

### Compile and hot-reloads for development

#### NPM CLI

Run the application server locally in debug mode with hot reloading via Nodemon.

```
npm run debug
```

#### Visual Code

Install VisualCode, open the 'server' folder via 'Open Folder'.

Using the Menu->Run->Start Debugging will launch the application in debug mode with hot reloading via Nodemon

### Linting and tests

```
npm run lint       # eslint .
npm run lint:fix   # eslint . --fix
npm test           # node --test "test/*.test.js"
```

## Hosting

See Google Cloud Hosting.

## Google Cloud Hosting

Login to Google Cloud hosting, select the same account that was setup for Firebase.

Enable the following APIs in the Enable APIs & Services section for the project.

* Cloud Source Repositories API
* Cloud Build API

### Project's cloudbuild.yaml

Update the cloudbuild.yaml file in the source project and change the following based on your account name

```
https://source.developers.google.com/p/<account name>/r/github_thzero_rocket_sidekick-common
```

### Setup Google Cloud Source Repositories

This is a mirror of the GitHub repo for the following repos:
* https://img.shields.io/github/package-json/v/thzero/rocket_sidekick-common
* https://img.shields.io/github/package-json/v/thzero/rocket_sidekick-server

* Add Repository
* Connect external repository
* Select the project setup by Firebase, then GitHub
* Select the web-common repo
* Connect selected repositories

Select repository, then permissions.  Verify that the Cloud Build Service Account is listed.

### Deploy to CloudRun

https://cloud.google.com/run/docs/continuous-deployment-with-cloud-build
https://cloud.google.com/run/docs/deploying#service

#### Settings for Cloud Run configuration

##### Cloud Run
* Continuously deploy new revisions from a source repository
* Use Set Up With Cloud Build
 * Select the Repository Provide and Repository
 * Click Next
 * Branch: ^master$
 * Build Type: Dockerfile
  * Source location: /Dockerfile
 * Click Save

##### CPU Allocation
* CPU is only allocated during request processing

##### Revision Autoscaling
* Minimum 0
* Maximum 1000

##### Ingress Control
* All

##### Authentication
* Allow unauthenticated invocations

##### Capacity
* 512mb 1 cpu
* Requested Timeout 300
* Max Request per Container 80

##### Variables & Secrets

Add these variables:

* SERVICE_ACCOUNT_KEY - <Firebase servicecAccountKey.json file in local config folder>
* AUTH_API_KEY - <guid>
* DB_DEFAULT - atla
* DB_CONNECTION_ALTAS - <connection string>
* DB_NAME_ALTAS - production
* DB_CONNECTION_MONGO - <connection string>
  * optional
* DB_NAME_MONGO - production
  * optional
* LOG_LEVEL - debug
* IP_ADDRESS - 0.0.0.0

#### Cloud Source Repository

In Cloud Build, go to the Repositories section.

* Select an appropriate region, should be for the same region as your Cloud Run is running on
* Select 2nd Gen
* Link Repository to create a link to your repository

##### Link Repository

###### Connection
* Create a new Host Connection

###### Region
* Select the same region as your Cloud Run is running on

###### Name
* Set name for the connection

* Click Connect to create the connection
* You may require the Security Manager API to be enabled
* Click Continue in the confirmation dialog

###### Github Installation
* Select an installation user or Install a new account

#### Cloud Build Trigger

##### Event
* Push to branch

###### Region
* Select the same region as used with the Cloud Source Repository

###### Repository Generation
* Select 2nd

##### Source
* Select the repository
* Select "^master$" branch

##### Configuration

###### Type
* Cloud Build configuration file (yaml or json)

###### Location
* Repository
* Cloud Build configuration file location
 * / cloudbuild.yaml

##### Deploy

Run the trigger to kick of a deploy.
