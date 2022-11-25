![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_server)
![David](https://img.shields.io/david/thzero/library_server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_server

An opinionated library of common functionality to bootstrap an API application using MongoDb and Firebase.  Currently either Fastify or Koa can be used as the web server; Fastify will be the focus going forward due to lack of support and updates with the Koa stack.

### Requirements

#### NodeJs

Requires [NodeJs ](https://nodejs.org) version 18+.

### Installation

[![NPM](https://nodei.co/npm/@thzero/library_server.png?compact=true)](https://npmjs.org/package/@thzero/library_server)

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
            "check": false,
            "useDefault": false
          }
        },
        "cors": {
            "origin": "*"
        },
        "db": {
            "atlas": {
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

##### Development Tool Configuration

* Include the following in the package.json for the application.

```
  "version_major": #,
  "version_minor": #,
  "version_patch": #,
  "version_date": "MM/DD/YYYY",
```
