![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_server)
![David](https://img.shields.io/david/thzero/library_server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_server

An opinionated library of common functionality to bootstrap an API application using MongoDb and Firebase.  Currently either Fastify or Koa can be used as the web server; Fastify will be the focus going forward due to lack of support and updates with the Koa stack.

### Requirements

#### NodeJs

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
