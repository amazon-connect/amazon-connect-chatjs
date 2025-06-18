# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.1]
### Added
- Add client-side idempotency to chatSession.sendMessage() and .sendEvent() (#275)
- (internal) publish StreamsJS error metrics when failed to load custom ccp chat session (#276)
- Update ReactNativeSupport.md documentation to use known-good version <= v3.0.2

## [3.1.0]
### Added
- Expose ChatJS version to global `window.connect.ChatJS.version`
- Add missing typescript declarations to `index.d.ts`
- Updating `ChatGlobalConfig` interface in `index.d.ts` for React Native `webSocketManagerConfig`

## [3.0.6]
### Added
- Updating connectivity and websocket logic
- Fix mobile websocket termination issue on network disruption

## [3.0.5]
### Added
- Updating `ChatGlobalConfig` interface in `index.d.ts` to include `features` and `customUserAgentSuffix` 

## [3.0.4]
### Added
- Adding read and delivered message receipt event types to `ChatEventContentType`
- Implementing UserAgent configuration for AWSClient + Adding UA suffix property on GlobalConfig

## [3.0.3]
### Added
- Authentication lifecycle events and APIs for authenticate customer flow block 
- Migrated baked-in dependency from AWS SDK v2 to AWS SDK v3: `src/client/aws-sdk-connectparticipant.js` #247

## [3.0.2]
### Added
- fix message receipts getting disabled if custom throttleTime is passed 

## [3.0.1]
### Added
- add `disableCSM` to custom typings file index.d.ts.

## [3.0.0]
### Added
- add custom typings file index.d.ts instead of auto-generating typings.

## [2.3.2]
### Fixed
- Prevent overriding connect global namespace when initialized

## [2.3.1]
### Added
- Update jest to fix security issues with old version.

## [2.2.5]
### Added
- Added new callback onChatRehydrted callbacks whenever websocket fires `.rehydrated` event.

## [2.2.4]
### Fixed
- onDeepHeartBeatFailure is undefined, updated websocketManager library file to fix the bug.

## [2.2.3]
### Fixed
- .onConnectionEstablished() is fired twice after invoking .connect(); closes #124
- enable message receipts by default; closes #132
- expose deep heartbeat success/failure callback to clients


## [2.2.2]
### Fixed
- reject send callbacks instead of returning null

## [2.2.1]

### Added
- Updated README to include important note about ConnAck migration

### Fixed
- Fix sendMessageReceipts to only send receipts if chat has not ended

## [2.2.0]
### Added
- Updated amazon-connect-websocket-manager.js library to enable Deep Heartbeat change for Chat widget users. 

## [2.1.0]
### Added
- The [DescribeView API](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_DescribeView.html)

## [2.0.2]
### Added
- Error message if API call is made before invoking session.connect(); #129

### Fixed
- sendEvent contentType README documentation
- delivered receipt logic causing deadlock promise; #131

## [2.0.1]
### Added
- Browser Refresh and Persistent Chat documentation
- More details to chatSession.sendAttachment README documentation
- Improved ReactNativeSupport documentation

### Fixed
- Exclude src folder when publishing code to npm
- Remove hardcoded usage of console.* methods; addresses #127
- Expose connectionDetails value; addresses #154

## [2.0.0]
### Added
- Initial TypeScript migration: auto-generate  `*.d.ts` files in dist folder.
- Delete and gitignore `dist` folder
- Add CDN link to README
- Fix typo for setting messageReceipts?.throttleTime in updateThrottleTime

## [1.5.1]
### Added
- updaing generating mapping file in dist folder.

## [1.5.0]
### Added
- support React Native applications with latest WebSocketManager fix

## [1.4.0]
### Added
- Migrate critical **connectionAcknowledge** event to CreateParticipantConnection API, and keep **sendEvent API** for  non-critical events like typing/read/delivered.
- Adding chatSession.onConnectionLost method which subscribes to the CHAT_EVENTS.CONNECTION_LOST event.

## [1.3.4]
### Added
- Throttle typing event. Throttle wait time is set to 10 seconds.
- add interactiveMessageResponse as a supported ContentType.

## [1.3.3]
### Changed
- fix unsafe-eval usage in code by updating webpack config.
- do not load CSM bundle if CSM is disabled.

## [1.3.2]
### Changed
- add application/json as a supported ContentType.

## [1.3.1]
### Changed
- fix csm initialization to add try-catch to prevent csm webworker initialization failures from affecting the main application.

## [1.3.0]
### Added
- Add message receipt. Message Receipts allow the sender of a chat message to view when their message has been delivered and read (seen) by the recipient.
- Add browser and OS usage client side metric to enhance the proactive identify issues.
### Changed
- fix global declaration.

## [1.2.0]
### Added
- Add client side metric service in order to enhance the customer experience and proactively identify issues. Detail: [README.md](https://github.com/amazon-connect/amazon-connect-chatjs#Client-side-metric).
- Update `.babelrc` file to fix the error of `ReferenceError: regeneratorRuntime is not defined`.

## [1.1.14]
### Added
- fix WebSocketManager logger so its instance is tied to WebsocketManager instance. Fixes the case where multiple connections are initiated in 1 browser session.
- update log message to contain logLevel and logMetaData

## [1.1.13]
### Added
- enabled logs for WebSocketManager
- add advanced_log level to Logger for customers to identify critical logs needed for WebSocket production debugging.
- add ability to re-connect to web socket after connection has ended.

### Changed
- remove websocket ended check for GetTranscript to allow GetTranscript after web socket has ended.
- updated package-lock [lockfileVersion](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json#lockfileversion) to 2 

## [1.1.12]
### Added
- This CHANGELOG file to serve as an evolving example of a standardized open source project CHANGELOG.
- Support for concurrent customer sessions and an agent session. Concurrent agent sessions are unsupported in [Streams](https://github.com/amazon-connect/amazon-connect-streams) and remain unsupported in ChatJS.
- Ability to configure a customized logger and other logging updates.

### Changed
- Upgrade babel, jest, and webpack-dev-server dependencies.
- Minor code refactorings.

### Fixed
- Fix ChatJS connections breaking when [Streams](https://github.com/amazon-connect/amazon-connect-streams) is terminated and re-initialized.
- Improve code coverage.

## [1.1.11] - 2022-05-20
### Changed
- Upgrade async, minimist, node-forge dependencies.

## [1.1.10] - 2022-03-10
### Changed
- Bumped webpack, babel, eslint, and jest

[Unreleased]: https://github.com/amazon-connect/amazon-connect-chatjs/compare/4378177e5d66b0615fe8435d9ed352199b8b7a9d...HEAD
[1.1.11]: https://github.com/amazon-connect/amazon-connect-chatjs/compare/b1e631b105bd6c6f8535cfe172678b517f5e0353...4378177e5d66b0615fe8435d9ed352199b8b7a9d
[1.1.10]: https://github.com/amazon-connect/amazon-connect-chatjs/compare/9ba35f8e63a8e6a86fa3b3128a0d91ca7e841e55...b1e631b105bd6c6f8535cfe172678b517f5e0353
