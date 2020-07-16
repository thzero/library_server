![GitHub package.json version](https://img.shields.io/github/package-json/v/thzero/library_server)
![David](https://img.shields.io/david/thzero/library_server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# library_server

An opinionated library of common functionality to bootstrap a Koa based API application using MongoDb and Firebase.

### Installation

[![NPM](https://nodei.co/npm/@thzero/library_server.png?compact=true)](https://npmjs.org/package/@thzero/library_server)

### Requirements

#### Mongo

Mongo is required as the server side data source.

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

## CLI

The tool includes a command line interface application that performs a couple of tasks

* Generate short UUIDs
* Update version information in a package.json

### Usage

```
cli <options>

--generate :: generates a UUIDs, either in short (default) or long format
  --number, --n :: the number of ids to generate
  --long, --l :: generates a long uuid

--updateversion :: updates the version
  --major, --ma :: sets the major version, defaults to the current value or 0
  --minor, --mi :: sets the minor version, defaults to the current value or 0
  --patch, --p :: sets the patch, defaults to the current value or 0
  --patch_inc, --pi :: increments the patch by one
  --date, --d :: sets the version date in MM/DD/YYYY format, defaults to current date
  --package, --pa :: sets the path of the package.json file
```

### Help

```
node -r esm cli.js --help
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --help
```

### Version

```
node -r esm cli.js --version
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --version
```

### Generate UUID examples

#### Single UUID

```
node -r esm cli.js --generate
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --generate
```

#### Multiple UUIDs

```
node -r esm cli.js --generate --n 5
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --generate --n 5
```

### Update Version examples

#### Increment patch

```
node -r esm cli.js --updateversion --pi
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --updateversion --pi --package \"../../../package.json\"
```

#### Update date

```
node -r esm cli.js --updateversion --d '7/15/2020'
// from within an application
node -r esm ./node_modules/@thzero/library/cli.js --updateversion --d '7/15/2020' --package \"../../../package.json\"
```
