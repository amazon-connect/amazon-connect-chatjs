# Amazon Connect ChatJS [![npm](https://img.shields.io/npm/v/amazon-connect-chatjs.svg?color=orange)](https://www.npmjs.com/package/amazon-connect-chatjs) [![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0) [![Node.js CI](https://github.com/amazon-connect/amazon-connect-chatjs/actions/workflows/node.js.yml/badge.svg?branch=master)](https://github.com/amazon-connect/amazon-connect-chatjs/actions/workflows/node.js.yml)

> **_Important note:_**  Amazon Connect has migrated the `Connection Acknowledgement(ConnAck)` from the [SendEvent](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html) API
to the [CreateParticipant](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CreateParticipantConnection.html) API.
Please upgrade your ChatJS to [1.4.0](https://github.com/amazon-connect/amazon-connect-chatjs/releases/tag/1.4.0) or a newer version to complete the migration by 12/31/2024.

## Table of contents

- [About](#about)
- [Getting Started](#getting-started)
  - [A note about the AWS-SDK and ChatJS](#a-note-about-the-aws-sdk-and-chatjs)
  - [Usage](#usage)
  - [Building](#building)
- [React Native Support](#react-native-support)
- [API](#api)
  - [`connect.ChatSession` API](#connectchatsession-api)
  - [ChatSession API](#chatsession-api)
    - [Amazon Connect Participant Service API wrappers](#amazon-connect-participant-service-api-wrappers)
    - [Events](#events)
    - [Client side metric](#client-side-metric)
    - [Other](#other)

## About

The Amazon Connect Chat javascript library (ChatJS) gives you the power to build your own chat widget to customize the chat experience. This can be used for both the agent user interface, in conjunction with [Amazon Connect Streams](https://github.com/aws/amazon-connect-streams), and for the customer chat interface.

There is a [Chat UI reference implementation](https://github.com/amazon-connect/amazon-connect-chat-ui-examples) here. This will help you deploy an API Gateway and Lambda function for initiating chat from your webpage. From there you can use the ChatJS library to build a custom widget.

### Learn More

To learn more about Amazon Connect and its capabilities, please check out
the [Amazon Connect User Guide](https://docs.aws.amazon.com/connect/latest/userguide/).

**New to Amazon Connect and looking to onboard with Chat/Messaging capabilities?** Refer to the [“Amazon Connect Chat Open Source Walkthrough”](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/blob/master/.github/docs/AmazonConnectChatOpenSourceWalkthrough.md) documentation, and [“Hosted Widget vs Custom Builder Solution”](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/blob/master/.github/docs/HostedWidgetVSCustomBuilderSolution.md) if building a customer-facing chat interface.

## Getting Started

### A note about the AWS-SDK and ChatJS

The AWS-SDK is, by default, included in ChatJS as a "baked-in" dependency. You can view it at `./client/aws-sdk-connectparticipant.js`. In `./client/client.js` we import `ConnectParticipant` from this file. This file and import can be removed while using the AWS SDK imported through a script in the page file of your application, assuming that version of the AWS SDK has the `ConnectParticipant` service included.
Incidentally, Amazon Connect Streams also contains a "baked-in" AWS SDK. This SDK cannot be removed, as it contains unreleased APIs that will not be available in the SDK you include as a script in the page file.
Therefore, there are several occasions where implementations can run into AWS SDK issues.

#### **Scenario 1:** Streams and ChatJS are used. You are not importing the AWS SDK

Ensure you import ChatJS after Streams.

#### **Scenario 2:** Streams and ChatJS are used. You are importing the AWS SDK

Import Streams, then ChatJS, then the SDK.
Ensure that your AWS SDK includes the ConnectParticipant Service (it is relatively new, so make sure you have an up-to-date AWS SDK version [^2.597.0]).

#### **Scenario 3:** ChatJS only, no AWS SDK import

No need to worry here, this will always work.

#### **Scenario 4:** ChatJS only, with AWS SDK import

Import ChatJS before the AWS SDK, and ensure the AWS SDK version you are using contains the ConnectParticipant Service.

#### A note for Scenarios 2 and 4

When using the SDK and ChatJS, you may remove the SDK from ChatJS to ensure lack of import conflicts. However, this should not be relevant if the order in which you are importing these libraries is the order reflected above.

#### Using AWS SDK ConnectParticipant Client

If you have replaced `./client/aws-sdk-connectparticipant.js` and use `@aws-sdk/client-connectparticipant`, make sure to import the aws-sdk after ChatJS

```
import 'amazon-connect-streams'; // <-- (optional) MUST be before ChatJS
import 'amazon-connect-chatjs';
import '@aws-sdk/client-connect'; // or 'aws-sdk'
import '@aws-sdk/clients/connectparticipant'; // <-- IMPORTANT - should be last
```


### Usage

#### Using ChatJS from npm

`npm install amazon-connect-chatjs`

#### Using ChatJS from CDN Link

`amazon-connect-chat.js` bundle file is also available over a CDN.

```html
<script src="https://unpkg.com/amazon-connect-chatjs@1.5.1"></script>
<!-- OR -->
<script src="https://cdn.jsdelivr.net/npm/amazon-connect-chatjs@1.5.1/dist/amazon-connect-chat.js"></script>

<!-- Specify exact version -->
<script src="https://unpkg.com/amazon-connect-chatjs@1.5.1"></script>
<script src="https://unpkg.com/amazon-connect-chatjs@1"></script>
<script src="https://unpkg.com/amazon-connect-chatjs"></script>

<!-- Use crossorigin if needed -->
<script crossorigin src="https://unpkg.com/amazon-connect-chatjs"></script>
```

#### Importing using npm and ES6

`import "amazon-connect-chatjs"`
Note: this will apply the global `connect` variable to your current scope.

#### TypeScript Support

`amazon-connect-chatjs` is compatible with TypeScript. You'll need to use version `typescript@^3.0.1` or higher:

```ts
import "amazon-connect-streams";

connect.ChatSession.create({ /* ... */ });
```

#### Using ChatJS from Github

```sh
git clone https://github.com/amazon-connect/amazon-connect-chatjs
```

### Building

1. Install latest LTS version of [NodeJS](https://nodejs.org)
2. Checkout this package into workspace and navigate to root folder
3. `npm install`
4. To build (non-minified):
    1. `npm run devo` for a non-minified build.
    2. Find build artifacts in **dist** directory.
5. To build (minified):
    1. `npm run release` for a minified build.
    2. Find build artifacts in **dist** directory.
6. To run unit tests:
    1. `npm run test`
7. To clean node_modules:
    1. `npm run clean`
8. To make webpack watch all files:
    1. `npm run watch`

Find build artifacts in **dist** directory -  This will generate a file called `amazon-connect-chat.js` - this is the full Connect ChatJS API which you will want to include in your page.

## React Native Support

Additional configuration is required to support ChatJS in React Native applications. Use `amazon-connect-chatjs@^1.5.0` and follow the documenation: [ReactNativeSupport.md](./.github/docs/ReactNativeSupport.md)

A demo application implementing basic ChatJS functionality is also available in the ui-examples repository: [connectReactNativeChat](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/connectReactNativeChat)

## API

### `connect.ChatSession` API

This is the main entry point to `amazon-connect-chatjs`.
All your interactions with the library start here.

#### `connect.ChatSession.setGlobalConfig()`

```js
connect.ChatSession.setGlobalConfig({
  loggerConfig: { // optional, the logging configuration. If omitted, no logging occurs
    // You can provide your own logger here, otherwise this property is optional
    customizedLogger: {
      debug: (...msg) => console.debug(...msg), // REQUIRED, can be any function
      info: (...msg) => console.info(...msg), // REQUIRED, can be any function
      warn: (...msg) => console.warn(...msg), // REQUIRED, can be any function
      error: (...msg) => console.error(...msg) // REQUIRED, can be any function
    },
    // There are five levels available - DEBUG, INFO, WARN, ERROR, ADVANCED_LOG. Default is INFO
    level: connect.LogLevel.INFO,
    // Choose if you want to use the default logger
    useDefaultLogger: true
  },
  region: "us-east-1", // optional, defaults to: "us-west-2"
  //Control switch for enabling/disabling message-receipts (Read/Delivered) for messages
  //message receipts use sendEvent API for sending Read/Delivered events https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html
  features: {
    messageReceipts: {
      shouldSendMessageReceipts: true, // DEFAULT: true, set to false to disable Read/Delivered receipts
      throttleTime: 5000 //default throttle time - time to wait before sending Read/Delivered receipt.
    }
  },
  // Pass in a user agent suffix used to configure the AWS SDK client in Amazon Connect ChatJS.
  // This will be appended to the x-amz-user-agent custom header used in outgoing API requests
  customUserAgentSuffix: "",
});
```

Set the global configuration to use. If this method is not called, the defaults of `loggerConfig` and `region` are used.
This method should be called before `connect.ChatSession.create()`.

Customizing `loggerConfig` for ChatJS:

- If you don't want to use any logger, you can skip this field.
- There are five log levels available - DEBUG, INFO, WARN, ERROR, ADVANCED_LOG.
- If you want to use your own logger, you can add them into `customizedLogger`, and add `customizedLogger` object as the value of `loggerConfig.customizedLogger`, then set the lowest logger level. `globalConfig.loggerConfig.useDefaultLogger` is not required.
- If you want to use the default logger provided by ChatJS, you can set the logger level, and set `useDefaultLogger` to true. `loggerConfig.customizedLogger` is not required.
- If you not only provide your own logger, but also set `useDefaultLogger` to true, your own logger will be overwritten by the default logger.
- `amazon-connect-chatjs/src/log.js` - has the logic to select LogLevel. Default value is INFO - which cause all logs with higher priority than INFO to be logged. eg: by default info, warn, error and advancedLog messages will be logged.
- Priority of logs:
  10: "DEBUG"
  20: "INFO"
  30: "WARN"
  40: "ERROR"
  50: "ADVANCED_LOG"

#### `connect.ChatSession.create()`

```js
const customerChatSession = connect.ChatSession.create({
  chatDetails: { // REQUIRED
    contactId: "...", // REQUIRED
    participantId: "...", // REQUIRED
    participantToken: "...", // REQUIRED
  },
  options: { // optional
    region: "us-east-1", // optional, defaults to `region` set in `connect.ChatSession.setGlobalConfig()`
  },
  type: "CUSTOMER", // REQUIRED
});
```

Creates an instance of `AgentChatSession` or `CustomerChatSession`, depending on the specified `type`.

If you're creating a `CustomerChatSession`, the `chatDetails` field should be populated with the response of the [StartChatContact](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html) API.

If you're creating an `AgentChatSession`, you must also include [`amazon-connect-streams`](https://github.com/amazon-connect/amazon-connect-streams). For example:

```js
// order is important, alternatively use <script> tags
import "amazon-connect-streams";
import "amazon-connect-chatjs";

connect.contact(contact => {
  if (contact.getType() !== connect.ContactType.CHAT) {
    // applies only to CHAT contacts
    return;
  }

  // recommended: calls `connect.ChatSession.setGlobalConfig()` and `connect.ChatSession.create()` internally
  contact.onAccepted(async () => {
    const cnn = contact.getConnections().find(cnn => cnn.getType() === connect.ConnectionType.AGENT);

    const agentChatSession = await cnn.getMediaController();
  });

  // alternative: if you want control over the args of `connect.ChatSession.setGlobalConfig()` and `connect.ChatSession.create()`
  contact.onAccepted(() => {
    const cnn = contact.getConnections().find(cnn => cnn.getType() === connect.ConnectionType.AGENT);

    const agentChatSession = connect.ChatSession.create({
      chatDetails: cnn.getMediaInfo(), // REQUIRED
      options: { // REQUIRED
        region: "us-east-1", // REQUIRED, must match the value provided to `connect.core.initCCP()`
      },
      type: connect.ChatSession.SessionTypes.AGENT, // REQUIRED
      websocketManager: connect.core.getWebSocketManager() // REQUIRED
    });
  });
});
```

See the [`amazon-connect-streams` API documentation](https://github.com/amazon-connect/amazon-connect-streams/blob/master/Documentation.md) for more information on the methods not documented here.

**Note:** `AgentChatSession` and `CustomerChatSession` are logical concepts.
As a result, the `instanceof` operator will not work how you expect:

```js
if (connect.ChatSession.create(/* ... */) instanceof connect.ChatSession) {
  // this will never execute
}
```

#### `connect.ChatSession.LogLevel`

```js
connect.ChatSession.LogLevel = {
  DEBUG: /* ... */,
  INFO: /* ... */,
  WARN: /* ... */,
  ERROR: /* ... */
};
```

Enumerates the logging levels.

#### `connect.ChatSession.SessionTypes`

```js
connect.ChatSession.SessionTypes = {
  AGENT: /* ... */,
  CUSTOMER: /* ... */
};
```

Enumerates the session types.

### ChatSession API

The `ChatSession` API divided into three sections: Amazon Connect Participant Service API wrappers, events, and other.

#### Amazon Connect Participant Service API wrappers

Functions in this section:

- Wrap the APIs of the [Amazon Connect Participant Service](https://docs.aws.amazon.com/connect-participant/latest/APIReference/Welcome.html).
- Return a `Promise<Response>` (except for `chatSession.connect()`), where:
  - `Response` is an [`aws-sdk` Response object](https://github.com/aws/aws-sdk-js/blob/master/lib/response.d.ts).
  - If the `Promise` rejects, the error will still be a `Response` object. However, the `data` field will not be populated while the `error` field will.
- Can optionally specify a `metadata` arg field (except for `customerChatSession.disconnectParticipant()`). The `metadata` arg field is not used directly by `amazon-connect-chatjs`, rather it's merely copied to the response object for usage by developers.

For example:

```js
function handleResponse(response) {
  // `response` is an aws-sdk `Response` object
  // `data` contains the response data
  // `metadata` === "foo"
  const { data, metadata } = response;
  // ...
}

function handleError(response) {
  // `response` is an aws-sdk `Response` object
  // `error` contains the response error
  // `metadata` === "foo"
  const { error, metadata } = response;
  // ...
}

chatSession
  .getTranscript({ metadata: "foo" })
  .then(handleResponse, handleError);
```

##### `chatSession.connect()`

```js
// connectCalled: indicates whether the Amazon Connect Participant Service was called
// connectSuccess: indicates whether the operation succeeded
const { connectCalled, connectSuccess } = await chatSession.connect();
```

Wraps the [CreateParticipantConnection](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CreateParticipantConnection.html) API.

The arguments and response do not overlap with the API request or response.

**Note:** If the operation fails, the `Promise` will reject, but the error will have the same schema as a successful response.

##### `chatSession.getTranscript()`

```js
const awsSdkResponse = await chatSession.getTranscript({
  maxResults: 100,
  sortOrder: "ASCENDING"
});
const { InitialContactId, NextToken, Transcript } = awsSdkResponse.data;
```

Wraps the [GetTranscript](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html#API_GetTranscript_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
- `MaxResults` defaults to `15`.
- `ScanDirection` defaults to `BACKWARD` always.
- `SortOrder` defaults to `ASCENDING`.

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html#API_GetTranscript_ResponseSyntax).

**Important note:** In order to specify `scanDirection` as `FORWARD`, you need to explicitly include a `startPosition`.
This is because the default `startPosition` is at the most recent update to the transcript, so requesting a transcript in the `FORWARD` direction from the default `startPosition` is equivalent to asking for a transcript containing only messages more recent than the present (you are asking for messages in the future!).

##### `chatSession.getAuthenticationUrl()`

```js
const awsSdkResponse = await chatSession.getAuthenticationUrl({
  redirectUri: 'www.example.com',
  sessionId: 'exampleId' //This comes from the authentication.initiated event
});
const authenticationUrl = getAuthenticationUrlResponse?.data?.AuthenticationUrl
```

Wraps the [GetAuthenticationUrl](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_GetAuthenticationUrl.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_GetAuthenticationUrl.html#API_connect-participant_GetAuthenticationUrl_RequestSyntax) 

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_GetAuthenticationUrl.html#API_connect-participant_GetAuthenticationUrl_ResponseSyntax).

**Important note:** The session id is only available from the authentication.initiated event which is only emitted when the authenticate customer contact flow block is used. The session id is a 1 time use code for this api. It can be re used in the cancelParticipantAuthentication api below 

##### `chatSession.cancelParticipantAuthentication()`

```js
const awsSdkResponse = await chatSession.cancelParticipantAuthentication({
  sessionId: 'exampleId' //This comes from the authentication.initiated event
});
```

Wraps the [CancelParticipantAuthentication](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_CancelParticipantAuthentication.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_CancelParticipantAuthentication.html#API_connect-participant_CancelParticipantAuthentication_RequestSyntax) 

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect/latest/APIReference/API_connect-participant_CancelParticipantAuthentication.html#API_connect-participant_CancelParticipantAuthentication_ResponseSyntax).

**Important note:** The session id is only available from the authentication.initiated event which is only emitted when the authenticate customer contact flow block is used. The session id is a 1 time use code.

##### `chatSession.sendEvent()`

```js
const awsSdkResponse = await chatSession.sendEvent({
  contentType: "application/vnd.amazonaws.connect.event.typing"
  clientToken: "12345", // (optional) idempotency key
});
const { AbsoluteTime, Id } = awsSdkResponse.data;
```

Wraps the [SendEvent](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
- `ClientToken`  is optional and can be used to ensure idempotency of the request.
- `ContentType` allows the following values:
  - `"application/vnd.amazonaws.connect.event.typing"`
  - `"application/vnd.amazonaws.connect.event.connection.acknowledged"`
  - `"application/vnd.amazonaws.connect.event.message.delivered"`
  - `"application/vnd.amazonaws.connect.event.message.read"`

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_ResponseSyntax).

##### `chatSession.sendMessage()`

```js
const awsSdkResponse = await chatSession.sendMessage({
  contentType: "text/plain",
  message: "Hello World!"
  clientToken: "12345", // (optional) idempotency key
});
const { AbsoluteTime, Id } = awsSdkResponse.data;
```

Wraps the [SendMessage](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
- `ClientToken`  is optional and can be used to ensure idempotency of the request.

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_ResponseSyntax).

##### `chatSession.sendAttachment()`

```js
/**
 * Attachment Object - the actual file to be sent between the agent and end-customer.
 * Documentation: https://developer.mozilla.org/en-US/docs/Web/API/File
 * @property {number} lastModified - The last modified timestamp of the file.
 * @property {string} name - The name of the file.
 * @property {number} size - The size of the file.
 * @property {string} type - The type of the file.
 * @property {string} webkitRelativePath - The relative path of the file specific to the WebKit engine.
 */
const awsSdkResponse = await chatSession.sendAttachment({
  attachment: attachment
});

// Example usage
var input = document.createElement('input');
input.type = 'file';
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  chatSession.sendAttachment({ attachment: file })
});
```

Wraps the [StartAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_StartAttachmentUpload.html) and [CompleteAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CompleteAttachmentUpload.html) API.
The arguments are based on the [StartAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_StartAttachmentUpload.html#API_StartAttachmentUpload_RequestSyntax) and [CompleteAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CompleteAttachmentUpload.html#API_CompleteAttachmentUpload_RequestSyntax) API request body with the following differences:

- Fields are in `camelCase`.
The response `data` is the same as the [StartAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_StartAttachmentUpload.html#API_StartAttachmentUpload_ResponseSyntax) and [CompleteAttachmentUpload](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CompleteAttachmentUpload.html#API_CompleteAttachmentUpload_ResponseSyntax) API response body.
`chatSession.sendAttachment()` invokes the StartAttachmentUpload API, uploads the Attachment to the S3 bucket using the pre-signed URL received in the StartAttachmentUpload API response and invokes the CompleteAttachmentUpload API to finish the Attachment upload process.

##### `chatSession.downloadAttachment()`

```js
const awsSdkResponse = await chatSession.downloadAttachment({
  attachmentId: "string"
});
const { attachment } = awsSdkResponse.data;
/* 
Attachment Object - This is the actual file that will be downloaded by either agent or end-customer.
attachment => {
  lastModified: long
  name: "string"
  size: long
  type: "string"
  webkitRelativePath: "string"
}
*/
```

Wraps the [GetAttachment](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAttachment.html) API.
The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAttachment.html#API_GetAttachment_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAttachment.html#API_GetAttachment_ResponseSyntax).
`chatSession.downloadAttachment()` invokes the GetAttachment using the AttachmentId as a request parameter and fetches the Attachment from the S3 bucket using the pre-signed URL received in the GetAttachment API response.

##### `customerChatSession.disconnectParticipant()`

```js
const awsSdkResponse = await customerChatSession.disconnectParticipant();
```

Wraps the [DisconnectParticipant](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_DisconnectParticipant.html) API.

The arguments and response do not overlap with the API request or response.

Once this method is called, the `CustomerChatSession` cannot be used anymore.

Applies only for `CustomerChatSession`. See `connect.ChatSession.create()` for more info.

#### Events

Function in this section:

- When invoked, register an event handler that is triggered whenever the event occurs.
- Can be called multiple times (i.e. register multiple event handlers).
- Receive an `event` object that contains a `chatDetails` field. See `chatSession.getChatDetails()` for more info.

##### `chatSession.onConnectionBroken()`

```js
chatSession.onConnectionBroken(event => {
  const { chatDetails } = event;
  // ...
});
```

Subscribes an event handler that triggers when the session connection is broken.

##### `chatSession.onConnectionEstablished()`

```js
chatSession.onConnectionEstablished(event => {
  const { chatDetails } = event;
  // ...
});
```

Subscribes an event handler that triggers when the session connection is established. In the case where the end customer loses network and reconnects to the chat, you can call getTranscript in this event handler to display any messages sent by the agent while end customer was offline. Make sure the next token is null in this call to getTranscript so that it returns the latest messages.

##### `chatSession.onEnded()`

```js
chatSession.onEnded(event => {
  const { chatDetails, data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the session is ended.

##### `chatSession.onAuthenticationInitiated()`

```js
chatSession.onAuthenticationInitiated(event => {
  const eventDetails = event?.data;
  try {
      content = JSON.parse(eventDetails?.Content);
    } catch (error) {
        console.error("Invalid JSON content", error);
  }
  const sessionId = content.SessionId;
  // use the session id to call getAuthenticationUrl
});
```

Subscribes an event handler that triggers when the contact flow reaches the authenticate customer flow block.

##### `chatSession.onAuthenticationSuccessful()`

```js
chatSession.onAuthenticationSuccessful(event => {
  const { data } = event;
});
```

Subscribes an event handler that triggers when authenticate customer flow block takes the success branch.

##### `chatSession.onAuthenticationFailed()`

```js
chatSession.onAuthenticationFailed(event => {
  const { data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the authenticate customer flow block takes the failed branch.

##### `chatSession.onAuthenticationTimeout()`

```js
chatSession.onAuthenticationTimeout(event => {
  const { data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the authenticate customer flow block has timed out.

##### `chatSession.onAuthenticationCanceled()`

```js
chatSession.onAuthenticationCanceled(event => {
  const { data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the contact flow reaches the authenticate customer flow block and the cancelParticipantAuthentication API is called.

##### `chatSession.onParticipantDisplayNameUpdated()`

```js
chatSession.onParticipantDisplayNameUpdated(event => {
  const authenticatedParticipantDisplayName = event.data?.DisplayName;
  // ...
});
```

Subscribes an event handler that triggers when the authenticate customer flow block takes the success branch and there is a customer profile associated with the user. The new display name will come in this event

##### `chatSession.onMessage()`

```js
chatSession.onMessage(event => {
  const { chatDetails, data } = event;
  switch (data.ContentType) {
    // ...
  }
});
```

Subscribes an event handler that triggers whenever a message or an event (except for `application/vnd.amazonaws.connect.event.typing`) is created by any participant.
The `data` field has the same schema as the [`Item` data type](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html) from the Amazon Connect Participant Service with the addition of the following **optional** fields: `ContactId`, `InitialContactId`.

 > **Warning**
The `messages` received over websocket are not guranteed to be in order!

Here is the code reference on how messages should be handled in the FrontEnd [Amazon-Connect-Chat-Interface](https://github.com/amazon-connect/amazon-connect-chat-interface/blob/master/src/components/Chat/ChatSession.js#L514) (This code handles removing messages with missing messageIds, duplicate messageIds and, sorting messages to handle display order of messages):

```js

this.ChatJSClient.onMessage((data) => {
  //deserialize message based on what UI component understands
  const message = createTranscriptItem(
        PARTICIPANT_MESSAGE,
      {
        data: data.text,
        type: data.type || ContentType.MESSAGE_CONTENT_TYPE.TEXT_PLAIN,
      },
      this.thisParticipant
  );

  this._addItemsToTranscript([message]);
});

const _addItemsToTranscript = (items) => {
  //filter and ignore messages not required for display
  items = items.filter((item) => !_isSystemEvent(item));

  //remove duplicate messageIds
  const newItemMap = items.reduce((acc, item) => 
                      ({ ...acc, [item.id]: item }), {});
  //remove messages missing messageIds
  const newTranscript = this.transcript.filter((item) =>
                         newItemMap[item.id] === undefined);

  newTranscript.push(...items);
  newTranscript.sort((a, b) => {
    const isASending = a.transportDetails.status === Status.Sending;
    const isBSending = b.transportDetails.status === Status.Sending;
    if ((isASending && !isBSending) || (!isASending && isBSending)) {
      return isASending ? 1 : -1;
    }
    return a.transportDetails.sentTime - b.transportDetails.sentTime;
  });

 this._updateTranscript(newTranscript);
}

const _isSystemEvent = (item) {
  return Object.values(EVENT_CONTENT_TYPE).indexOf(item.contentType) !== -1;
}

const EVENT_CONTENT_TYPE: {
    TYPING: "application/vnd.amazonaws.connect.event.typing",
    READ_RECEIPT: "application/vnd.amazonaws.connect.event.message.read",
    DELIVERED_RECEIPT: "application/vnd.amazonaws.connect.event.message.delivered",
    PARTICIPANT_JOINED: "application/vnd.amazonaws.connect.event.participant.joined",
    PARTICIPANT_LEFT: "application/vnd.amazonaws.connect.event.participant.left",
    PARTICIPANT_INVITED: "application/vnd.amazonaws.connect.event.participant.invited",
    TRANSFER_SUCCEEDED: "application/vnd.amazonaws.connect.event.transfer.succeed",
    TRANSFER_FAILED: "application/vnd.amazonaws.connect.event.transfer.failed",
    CONNECTION_ACKNOWLEDGED: "application/vnd.amazonaws.connect.event.connection.acknowledged",
    CHAT_ENDED: "application/vnd.amazonaws.connect.event.chat.ended"
}


//send data to update Store or UI component waiting for next chat-message
_updateTranscript(transcript) {
  this._triggerEvent("transcript-changed", transcript);
}

```

##### `chatSession.onTyping()`

```js
chatSession.onTyping(event => {
  const { chatDetails, data } = event;
  if (data.ParticipantRole === "AGENT") {
    // ...
  }
});
```

Subscribes an event handler that triggers whenever a `application/vnd.amazonaws.connect.event.typing` event is created by any participant.
The `data` field has the same schema as `chatSession.onMessage()`.

 ##### `chatSession.onParticipantInvited()`
  
 ```js
 /**
  * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.invited" event is created by any participant. 
  * @param {
     AbsoluteTime?: string,
     ContentType?: string,
     Type?: string,
     ParticipantId?: string,
     DisplayName?: string,
     ParticipantRole?: string,
     InitialContactId?: string
  } event.data
  */
 chatSession.onParticipantInvited(event => {
   const { chatDetails, data } = event;
   if (data.ParticipantRole === "AGENT") {
     // ...
   }
 });
 ```

##### `chatSession.onParticipantIdle()`

```js
/**
 * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.idle" event is created by any participant. 
 * @param {
    AbsoluteTime?: string,
    ContentType?: string,
    Type?: string,
    ParticipantId?: string,
    DisplayName?: string,
    ParticipantRole?: string,
    InitialContactId?: string
 } event.data
 */
chatSession.onParticipantIdle(event => {
  const { chatDetails, data } = event;
  if (data.ParticipantRole === "AGENT") {
    // ...
  }
});
```

##### `chatSession.onParticipantReturned()`

```js
/**
 * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.returned" event is created by any participant. 
 * @param {
    AbsoluteTime?: string,
    ContentType?: string,
    Type?: string,
    ParticipantId?: string,
    DisplayName?: string,
    ParticipantRole?: string,
    InitialContactId?: string
 } event.data
 */
chatSession.onParticipantReturned(event => {
  const { chatDetails, data } = event;
  if (data.ParticipantRole === "AGENT") {
    // ...
  }
});
```

##### `chatSession.onAutoDisconnection()`

```js
/**
 * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.autodisconnection" event is created by any participant. 
 * @param {
    AbsoluteTime?: string,
    ContentType?: string,
    Type?: string,
    ParticipantId?: string,
    DisplayName?: string,
    ParticipantRole?: string,
    InitialContactId?: string
 } event.data
 */
chatSession.onAutoDisconnection(event => {
  const { chatDetails, data } = event;
  if (data.ParticipantRole === "AGENT") {
    // ...
  }
});
```

`onParticipantIdle`, `onParticipantReturned`, and `onAutoDisconnection` are related to [set up chat timeouts for chat participants](https://docs.aws.amazon.com/connect/latest/adminguide/setup-chat-timeouts.html).

##### `chatSession.onConnectionLost()`

```js
chatSession.onConnectionLost(event => {
  const { chatDetails, data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the session is lost.

##### `chatSession.onDeepHeartbeatFailure()`

```js
chatSession.onDeepHeartbeatFailure(event => {
  const { chatDetails, data } = event;
  // ...
});
```

Subscribes an event handler that triggers when deep heartbeat fails.

##### `chatSession.onChatRehydrated()`
**Note**: Only when persistent chat is enabled.
```js
/**
 * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.chat.rehydrated" event is fired. 
 * @param {
    AbsoluteTime?: string,
    ContentType?: string,
    Type?: string,
    ParticipantId?: string,
    DisplayName?: string,
    ParticipantRole?: string,
    InitialContactId?: string
 } event.data
 */
chatSession.onChatRehydrated(event => {
  const { chatDetails, data } = event;
  // Load previous transcript...
});
```

#### Client side metric

In version `1.2.0` the client side metric(CSM) service is added into this library. Client side metric can provide insights into the real performance and usability, it helps us to understand how customers are actually using the website and what UI experiences they prefer. This feature is enabled by default. User can also disable this feature by passing a flag: `disableCSM` when they create a new chat session:

```js
const customerChatSession = connect.ChatSession.create({
  ...,
  disableCSM: true
});
```

#### Other

This section contains all the functions that do not fall under the previous two categories.

##### `chatSession.getChatDetails()`

```js
const {
  contactId,
  initialContactId,
  participantId,
  participantToken,
} = chatSession.getChatDetails();
```

Gets the chat session details.

##### `chatSession.describeView()`
```js
const {
  View
} = chatSession.describeView({
  viewToken: "QVFJREFIaGIyaHZJWUZzNlVmMGVIY2NXdUVMMzdBTnprOGZkc3huRzhkSXR6eExOeXdGYTFwYitiOGRybklmMEZHbjBGZU1sQUFBQWJqQnNCZ2txaGtpRzl3MEJCd2FnWHpCZEFnRUFNRmdHQ1NxR1NJYjNEUUVIQVRBZUJnbGdoa2dCWlFNRUFTNHdFUVFNKys3ei9KTU41dG1BMWF4UkFnRVFnQ3NLckhKTEdXMUsyR1kvVHBUWWp0SmZxSG83VlcvOTg5WGZvckpMWDhOcGVJVHcrWUtnWjVwN3NxNGk6OlJ6STltam5rZjBiNENhOVdzM0wwaWxjR1dWUUxnb1Y1dmxNaEE5aGRkemZuV09hY0JEZFlpWFhpWnRPQlowNW9HT28xb0VnZ3JWV21aeWN0anhZZi9lOUdrYklSZVR5N2tpQmRRelFXSGpXZHpFSUExRCtvcWl5VGMzMzJoaWRldU5IaWwreEkvNmNmWUtpMXd5Qnh1aG0yY1AyWmk2byt2bTRDalFhWGxaM0Zrb1dqLy91aDVvRmtZcDY4UERuU0ZVQ1AyUU0zcjhNazI1ckZ2M0p6Z210bnMrSzVYY2VPN0xqWE1JMHZ0RE5uVEVYR1ZDcnc3SE82R0JITjV4NWporWGM9\\\", //REQUIRED
  metadata: "foo" //OPTIONAL
}).data;
```
 Wraps the [DescribeView](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_DescribeView.html) API.
 
The arguments are based on the [API model](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_DescribeView.html) with the following differences:
 
- All fields are in camelCase. 
 
ChatJS automatically supplies the connectionToken via the session's internal data. 
This api will only function after `chatSession.connect()` succeeds.

##### `agentChatSession.cleanUpOnParticipantDisconnect()`

```js
agentChatSession.cleanUpOnParticipantDisconnect();
```

Cleans up all event handlers.

Applies only for `AgentChatSession`. See `connect.ChatSession.create()` for more info.

## Handle Browser Refresh

Reconnect to an active chat after refreshing the browser. Call the `CreateParticipantConnection` API on refresh with the same `ParticipantToken` generated from the initial `StartChatContact` request.

### Reference

- `StartChatContact` API: initiate the chat contact [[Documentation](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html)]
- `CreateParticipantConnection` API: create the participant's connection [[Documentation](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CreateParticipantConnection.html)]
- "Enable real-time chat message streaming": further streaming capabilities [[Documentation](https://docs.aws.amazon.com/connect/latest/adminguide/chat-message-streaming.html)]

### Walkthrough

1. Initial StartChatContact request is made, `ParticipantToken` gets stored

```js
// Option #1 - Invoking the startChatContactAPI lambda CloudFormation template

// https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/cloudformationTemplates/startChatContactAPI
var contactFlowId = "12345678-1234-1234-1234-123456789012";
var instanceId = "12345678-1234-1234-1234-123456789012";
var apiGatewayEndpoint = "https://<api-id>.execute-api.<region>.amazonaws.com/Prod/";
var region = "<region>";

// Details passed to the lambda
const initiateChatRequest = {
  ParticipantDetails: {
    DisplayName: name
  },
  ContactFlowId: contactFlowId,
  InstanceId: instanceId,
  Attributes: JSON.stringify({
    "customerName": name // pass this to the Contact flow
  }),
  SupportedMessagingContentTypes: ["text/plain", "text/markdown"]
};

window.fetch(apiGatewayEndpoint, {
  method: 'post',
  body: JSON.stringify(initiateChatRequest),
})
    .then((res) => res.json())
    .then((res) => {
      return res.data.startChatResult;
    })
    .catch((err) => {
      console.error('StartChatContact Failure', err)
    });

// StartChatContact response gets stored
const initialStartChatResponse = {
    ContactId,
    ParticipantId,
    ParticipantToken
};
```

```js
// Option #2 - Invoking the AWK SDK `connect.startChatContact`

var AWS = require('aws-sdk');
AWS.config.update({region: process.env.REGION});
var connect = new AWS.Connect();

// https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html
const startChatRequest = {
  ParticipantDetails: {
    DisplayName: "Customer1"
  },
  ContactFlowId: contactFlowId,
  InstanceId: instanceId,
  Attributes: JSON.stringify({
    customerName: "Customer1" // pass this to the Contact flow
  }),
  SupportedMessagingContentTypes: ["text/plain", "text/markdown"]
};

// Initial StartChatContact call
connect.startChatContact(startChatRequest, function(err, data) {
    if (err) {
        console.log("Error starting the chat.", err);
        reject(err);
    } else {
        console.log("Start chat succeeded with the response: " + JSON.stringify(data));
        resolve(data);
    }
});
```

2. Initial `CreateParticipantConnection` request is made, customer initializes chat session

```js
// global "connect" imported from `amazon-connect-chatjs`

var chatSession;

// Initial CreateParticipantConnection call
chatSession = await connect.ChatSession.create({
  options: { // optional
    region: "us-west-2", // optional, defaults to `region` set in `connect.ChatSession.setGlobalConfig()`
  },
  chatDetails: {
    ContactId
    ParticipantId
    ParticipantToken     //  <---- from initialStartChatResponse
  },
  type: "CUSTOMER",
});
```

3. Events and messages are sent in the current chat session from customer

```js
await chatSession.connect();

await chatSession.sendMessage({
  contentType: "text/plain",
  message: "Hello World!"
});
```

4. Customer refreshes the browser tab and loses websocket connection

```js
// Browser is refreshed
location.reload();
```

5. Another `CreateParticipantConnection` request is made with the initial `ParticipantToken`

```js
// Second CreateParticipantConnection request
chatSession = await connect.ChatSession.create({
  chatDetails: {
    ContactId
    ParticipantId
    ParticipantToken     //  <---- from initialStartChatResponse
  },
  type: "CUSTOMER",
});
```

6. Events and messages are sent in the same current chat session

```js
await chatSession.connect();

await chatSession.sendMessage({
  contentType: "text/plain",
  message: "Hello World!"
});
```

## Enabling Persistent Chat

> For latest documentation, please follow instructions in ["Admin guide: Enable persistent chat"](https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html)

Persistent chats enable customers to resume previous conversations with the context, metadata, and transcripts carried over, eliminating the need for customers to repeat themselves and allowing agents to provide personalized service with access to the entire conversation history. To set up persistent chat experiences, simply provide a previous contact id when calling the StartChatContact API to create a new chat contact.

Learn more about persistent chat: https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html

### Reference

 - Initial release date: 1/20/2023
 - [Admin Guide Documentation](https://docs.aws.amazon.com/connect/latest/adminguide/chat-persistence.html)
 - [Launch Annoucement](https://aws.amazon.com/about-aws/whats-new/2023/01/amazon-connect-persistent-chat-experiences/)

### Configuration

> ⚠️ Only chat sessions that have ended are allowed to rehydrate onto a new chat session.

Chat transcripts are pulled from previous chat contacts, and displayed to the customer and agent.

To enable persistent chat, provide the previous `contactId` in the `SourceContactId` parameter of [`StartChatContact`](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html) API.

```http
PUT /contact/chat HTTP/1.1
Content-type: application/json
{
   "Attributes": {
      "string" : "string"
   },
   "ContactFlowId": "string",
   "InitialMessage": {
      "Content": "string",
      "ContentType": "string"
   },
   "InstanceId": "string",
   ... // other chat fields

   // NEW Attribute for persistent chat
   "PersistentChat" : {
       "SourceContactId": "2222222-aaaa-bbbb-2222-222222222222222"
       "RehydrationType": "FROM_SEGMENT" // ENTIRE_PAST_SESSION | FROM_SEGMENT
   }
}
```


## Enabling Attachment Scanner

You can configure Amazon Connect to scan attachments that are sent during a chat or uploaded to a case. You can scan attachments by using your preferred scanning application. For example, you can scan attachments for malware before they are approved to be shared between participants of a chat.

Learn more about attachment scanning: https://docs.aws.amazon.com/connect/latest/adminguide/setup-attachment-scanning.html

Amazon Connect will send the result (APPROVED | REJECTED) of the scanned attachment as a message in the websocket. To render it in your chat, you can use the following example code in the onMessage handler

```

this.client.onMessage(data => {
  const attachmentStatus = data.data.Attachments?.[0]?.Status;
    
  if (attachmentStatus === 'REJECTED') {
    renderAttachmentError(attachmentStatus) //your custom implementation
  }
});

```
