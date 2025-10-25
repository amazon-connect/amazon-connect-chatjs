# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Amazon Connect ChatJS - Developer Guide

## Overview
Amazon Connect ChatJS is a JavaScript library that enables building custom chat interfaces for Amazon Connect. It provides WebSocket-based real-time communication, AWS SDK integration, and supports both customer and agent chat sessions.

## Project Structure

```
amazon-connect-chatjs/
├── src/
│   ├── client/              # AWS SDK client integration
│   │   ├── client.js       # Main client implementation with IPv6 dual-stack support
│   │   ├── client.spec.js  # Client tests
│   │   ├── dualstack.spec.js # IPv6 dual-stack tests
│   │   └── aws-sdk-connectparticipant.js # Bundled AWS SDK
│   ├── core/               # Core functionality
│   │   ├── chatController.js
│   │   ├── chatSession.js
│   │   └── exceptions.js
│   ├── websocket/          # WebSocket management
│   ├── log.js              # Logging system
│   ├── globalConfig.js     # Global configuration
│   └── constants.js        # Constants and enums
├── examples/               # HTML examples
├── dist/                   # Built files
├── test/                   # Test setup
└── docs/                   # Documentation
```

## Key Components

### 1. Client Layer (`src/client/client.js`)
- **AWSChatClient**: Main client for AWS API communication
- **IPv6 Dual-Stack Support**: Automatic fallback to IPv4 with session persistence
- **API Wrappers**: Wraps AWS ConnectParticipant APIs
- **Session State**: Tracks IPv4 fallback state (`hasFallenBackToIPv4`, `fallbackClient`)

### 2. Chat Session (`src/core/chatSession.js`)
- **CustomerChatSession**: For customer-facing chat
- **AgentChatSession**: For agent chat (requires StreamsJS)
- **Event Handlers**: WebSocket event management
- **Message Handling**: Send/receive messages and events

### 3. WebSocket Management (`src/websocket/`)
- **Connection Management**: Handles WebSocket connections
- **Reconnection Logic**: Automatic reconnection with exponential backoff
- **Event Routing**: Routes WebSocket events to appropriate handlers

### 4. Global Configuration (`src/globalConfig.js`)
- **Feature Flags**: Enable/disable features
- **Region Settings**: AWS region configuration
- **Logging Configuration**: Configure logging levels
- **Message Receipts**: Control read/delivered receipts

## Development Workflow

### Common Commands
```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch tests
npm run test:watch

# Build (development)
npm run devo

# Build (production)
npm run release

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Start development server
npm run server

# Clean build artifacts
npm run clean
```

### Testing
- **Test Framework**: Jest with jsdom environment
- **Test Files**: Located alongside source files (`.spec.js`)
- **Coverage**: Configured to collect coverage from `src/**/*.js`
- **Key Test Suites**:
  - `src/client/client.spec.js`: Client functionality tests
  - `src/client/dualstack.spec.js`: IPv6 dual-stack feature tests

### Building
- **Webpack**: Used for bundling
- **Output**: `dist/amazon-connect-chat.js`
- **TypeScript**: Type definitions in `dist/index.d.ts`

## Key Features

### IPv6 Dual-Stack Support
- **Location**: `src/client/client.js:379-393` (original `_sendRequest`)
- **Fallback Logic**: Automatically falls back to IPv4 on IPv6 failures
- **Session Persistence**: Once fallback occurs, continues using IPv4 for session
- **Implementation**: 
  - `hasFallenBackToIPv4`: Boolean flag for session state
  - `fallbackClient`: Cached IPv4 client for subsequent requests
  - `_sendRequestWithIPv4Fallback`: Handles initial fallback

### Message Receipts
- **Feature Flag**: `FEATURES.MESSAGE_RECEIPTS_ENABLED`
- **Throttling**: 5-second default throttle for read/delivered receipts
- **Configuration**: Can be disabled via `features.messageReceipts.shouldSendMessageReceipts`

### Logging System
- **Levels**: DEBUG, INFO, WARN, ERROR, ADVANCED_LOG
- **Configuration**: Via `loggerConfig` in global config
- **Custom Loggers**: Support for custom logger implementations

## Important Files and Patterns

### Configuration
- **Global Config**: `src/globalConfig.js` - Central configuration management
- **Constants**: `src/constants.js` - Shared constants and enums
- **Package Info**: `package.json` - Dependencies and scripts

### Error Handling
- **Exceptions**: `src/core/exceptions.js` - Custom exception classes
- **Client Errors**: Standardized error objects with type, message, stack, statusCode

### Testing Patterns
- **Mock GlobalConfig**: Tests mock `../globalConfig` module
- **Timer Mocking**: Uses `jest.useFakeTimers()` for throttling tests
- **State Isolation**: Tests clear caches and reset state between runs

## Environment-Specific Notes

### React Native Support
- **Network Detection**: Requires custom `isNetworkOnline` function
- **WebSocket Config**: Special configuration for React Native environments
- **Documentation**: `docs/ReactNativeSupport.md`

### Browser Support
- **ES6 Modules**: Uses ES6 imports/exports
- **Polyfills**: May require polyfills for older browsers
- **CDN Usage**: Available via unpkg and jsDelivr

## API Integration

### AWS SDK
- **Version**: AWS SDK v3 (ConnectParticipant)
- **Bundled**: Custom bundled SDK in `src/client/aws-sdk-connectparticipant.js`
- **Commands**: Uses command pattern for API calls

### Supported APIs
- CreateParticipantConnection
- SendMessage
- SendEvent
- GetTranscript
- SendAttachment/GetAttachment
- DisconnectParticipant
- GetAuthenticationUrl
- CancelParticipantAuthentication

## Common Development Tasks

### Adding New Features
1. Update `src/constants.js` with new feature flags
2. Implement feature in appropriate module
3. Add tests in corresponding `.spec.js` file
4. Update documentation
5. Update examples if customer-facing

### Debugging
- **Enable Debug Logging**: Set `loggerConfig.level` to `DEBUG`
- **Chrome DevTools**: Use Network tab to inspect WebSocket traffic
- **Test Isolation**: Use `jest.clearAllMocks()` between tests

### Performance Considerations
- **Throttling**: Typing events are throttled to prevent spam
- **Caching**: Client instances are cached per region
- **Memory Management**: Clean up event listeners on disconnect

## Security Notes
- **No Hardcoded Credentials**: Uses empty credentials with participant tokens
- **HTTPS Only**: All API calls use HTTPS
- **Token-Based Auth**: Uses participant tokens for authentication
- **Input Validation**: Validate all user inputs before API calls

## Known Issues and Debugging

### IPv6 Dual-Stack
- **Testing**: Use `examples/ipv6-dual-stack-example.html` for testing
- **Fallback Behavior**: Once IPv4 fallback occurs, persists for entire session
- **Debugging**: Check endpoint status in example for fallback state

### Message Ordering
- **WebSocket Messages**: Not guaranteed to be in order
- **Solution**: Sort by timestamp and filter duplicates by ID
- **Implementation**: See README examples for proper message handling

### CSM (Client-Side Metrics)
- **Safe to Disable**: Set `disableCSM: true` in session creation
- **Internal Feature**: Used for Amazon internal metrics
- **Errors**: Common CSM errors can be safely ignored

## Version Management
- **Semantic Versioning**: Uses semver for releases
- **Changelog**: `CHANGELOG.md` tracks changes
- **Release Process**: Uses GitHub Actions for CI/CD
- **NPM Publishing**: Automated via GitHub Actions

This guide should help you understand the codebase structure and development patterns. Always run tests before making changes and follow the existing code style and patterns.