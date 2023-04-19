# Amazon Connect ChatJS

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

### Usage

#### Using ChatJS from npm

`npm install amazon-connect-chatjs`

#### Importing using npm and ES6

`import "amazon-connect-chatjs"`
Note: this will apply the global `connect` variable to your current scope.

#### TypeScript Support

`amazon-connect-chatjs` is compatible with TypeScript. You'll need to use version `3.0.1` or higher:

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
      debug: (msg) => console.debug(msg), // REQUIRED, can be any function
      info: (msg) => console.info(msg), // REQUIRED, can be any function
      warn: (msg) => console.warn(msg), // REQUIRED, can be any function
      error: (msg) => console.error(msg) // REQUIRED, can be any function
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
  }
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
  type: connect.ChatSession.SessionTypes.CUSTOMER, // REQUIRED
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

##### `chatSession.sendEvent()`

```js
const awsSdkResponse = await chatSession.sendEvent({
  contentType: "application/vnd.amazonaws.connect.event.typing"
});
const { AbsoluteTime, Id } = awsSdkResponse.data;
```

Wraps the [SendEvent](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
- `ClientToken` cannot be specified.
- `ContentType` allows the following values:
  - `"application/vnd.amazonaws.connect.event.chat.ended"`
  - `"application/vnd.amazonaws.connect.event.participant.joined"`
  - `"application/vnd.amazonaws.connect.event.participant.left"`
  - `"application/vnd.amazonaws.connect.event.transfer.succeeded"`
  - `"application/vnd.amazonaws.connect.event.transfer.failed"`
  - `"application/vnd.amazonaws.connect.event.typing"`

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_ResponseSyntax).

##### `chatSession.sendMessage()`

```js
const awsSdkResponse = await chatSession.sendMessage({
  contentType: "text/plain",
  message: "Hello World!"
});
const { AbsoluteTime, Id } = awsSdkResponse.data;
```

Wraps the [SendMessage](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html) API.

The arguments are based on the [API request body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_RequestSyntax) with the following differences:

- Fields are in `camelCase`.
- `ClientToken` cannot be specified.

The response `data` is the same as the [API response body](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_ResponseSyntax).

##### `chatSession.sendAttachment()`

```js
// attachment object is the actual file that will be sent to agent from end-customer and vice versa.
const awsSdkResponse = await chatSession.sendAttachment({
  attachment: attachment
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

Subscribes an event handler that triggers when the session connection is established.

##### `chatSession.onEnded()`

```js
chatSession.onEnded(event => {
  const { chatDetails, data } = event;
  // ...
});
```

Subscribes an event handler that triggers when the session is ended.

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

##### `agentChatSession.cleanUpOnParticipantDisconnect()`

```js
agentChatSession.cleanUpOnParticipantDisconnect();
```

Cleans up all event handlers.

Applies only for `AgentChatSession`. See `connect.ChatSession.create()` for more info.
