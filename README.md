# Amazon Connect ChatJS #
**amazon-connect-chatjs** provides chat support to AmazonConnect customers when they choose to directly integrate with AmazonConnect API and not using AmazonConnect web application.
It implements Amazon Connect Chat service protocals and provides a simple contact session interface which can be integrated with [Amazon Connect StreamJS](https://github.com/aws/amazon-connect-streams) seemlessly.

## Usage ##
### Prebuilt releases
TODO
### Build your own
1. Install latest LTS version of [NodeJS](https://nodejs.org)
2. Checkout this package into workspace and navigate to root folder
3. `npm install`
4. To build:
    1. `npm run dev`
    2. Find build artifacts in **dist** directory
6. To run unit tests:
    1. `npm run test`
7. To run demo page:
    1. `npm run showcase`
    2. Open the URL printed out by connect task, it looks like "Started connect web server on <https://localhost:3000>"
    3. Click **demo** folder

## Amazon Connect StreamJS integration ##
TODO

## Amazon internal
1. checkout the package and run "brazil-build"
and for development - run "brazil-build dev" and  to start the development server "brazil-build server"
