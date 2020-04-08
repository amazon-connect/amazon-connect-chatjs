# About
The Amazon Connect Chat javascript library (ChatJS) gives you the power to build your own chat widget to customize the chat experience. This can be used for both the Agent User Interface, in conjunction with [Amazon Connect Streams](https://github.com/aws/amazon-connect-streams) and for the customer chat interface. 

There is a [Chat UI reference implementation](https://github.com/amazon-connect/amazon-connect-chat-ui-examples) here. This will help you deploy an API Gateway and Lambda function for initiating chat from your webpage. From there you can use the ChatJS library to build a custom widget.

# Learn More
To learn more about Amazon Connect and its capabilities, please check out
the [Amazon Connect User Guide](https://docs.aws.amazon.com/connect/latest/userguide/).

# Getting Started

### A note about the AWS-SDK and ChatJS
The AWS-SDK is, by default, included in ChatJS as a "baked-in" dependency. You can view it at `./client/aws-client.js`. In `./client/client.js` we import `ConnectParticipant` from this file. This file and import can be removed while using the AWS SDK imported through a script in the page file of your application, assuming that version of the AWS SDK has the `ConnectParticipant` service included.
Incidentally, Amazon Connect Streams also contains a "baked-in" AWS SDK. This SDK cannot be removed, as it contains unreleased APIs that will not be available in the SDK you include as a script in the page file. 
Therefore, there are several occasions where implementations can run into AWS SDK issues.

#### Scenario 1: Streams and ChatJS are used. You are not importing the AWS SDK.
Ensure you import ChatJS after Streams.

#### Scenario 2: Streams and ChatJS are used. You are importing the AWS SDK.
Import Streams, then ChatJS, then the SDK. 
Ensure that your AWS SDK includes the ConnectParticipant Service (it is relatively new, so make sure you have an up-to-date AWS SDK version [^2.597.0]).

#### Scenario 3: ChatJS only, no AWS SDK import.
No need to worry here, this will always work.

#### Scenario 4: ChatJS only, with AWS SDK import.
Import ChatJS before the AWS SDK, and ensure the AWS SDK version you are using contains the ConnectParticipant Service.

#### A note for Scenarios 2 and 4.
When using the SDK and ChatJS, you may remove the SDK from ChatJS to ensure lack of import conflicts. However, this should not be relevant if the order in which you are importing these libraries is the order reflected above.

### Using ChatJS from npm

`npm install amazon-connect-chatjs`

# Importing using npm and ES6
`import "amazon-connect-chatjs"`
Note: this will apply the global `connect` variable to your current scope.

### Using ChatJS from Github
```
$ git clone https://github.com/amazon-connect/amazon-connect-chatjs
```
# Building
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

### Initialization
Setup the globalConfig and logger for ChatJS to use.
```
var logger = {
  debug: (data) => {console.debug(data);},
  info: (data) => {console.info(data);},
  warn: (data) => {console.warn(data);},
  error: (data) => {console.error(data);}
}

var globalConfig = {
  loggerConfig: {
    logger: logger,
    // There are four levels available - DEBUG, INFO, WARN, ERROR. Default is INFO.
    level: connect.ChatSession.LogLevel.INFO,
  },
  region: "us-west-2" // "us-west-2" is the default value.
};

connect.ChatSession.setGlobalConfig(globalConfig);
```

### `connect.ChatSession.create`
`Method param:` args
```
args = {
    "chatDetails": chatDetails,
    "type": sessionType,//two types of sesstionType: 
                        //connect.ChatSession.SessionTypes.CUSTOMER 
                        //connect.ChatSession.SessionTypes.AGENT
    "options": options,
    "websocketManager": WebSocketManager
};

chatDetails = {
  "ContactId": "<>",
  "ParticipantId": "<>",
  "ParticipantToken": "<>"
};


var chatSession = connect.ChatSession.create(inputForChatSession);
```

Use the chatSession object to subscribe to the following callbacks. Example - The onMessage callback is used to handle any messages sent from one of the participants or the chat service.

```
chatSession.onConnectionBroken(data => {console.log("connection broken with server")});
chatSession.onTyping(data => {console.log("someone is typing! details:", data)});
chatSession.onMessage(data => {console.log("there  is message! details:", data)});
chatSession.onConnectionEstablished(data => {console.log("connection established with server")});
chatSession.onEnded(() => {console.log("chat has ended")})
```
# Usage:

### `connect.ChatSession.connect`
`Method param:` args
```
args = {
    "metadata": metadata //required: no
}
```
Establish the connection with the back end by calling the *connect* function of the chatSession. It returns a Promise object.
```
chatSession.connect().
    then((response) => console.log("Chat is connected!")).
    catch((error) => console.log("Could not connect."));
```

### `connect.ChatSession.disconnectParticipant`
`Method param:` args

```
// Below method is not available on the agentChatController. 
// It is present only on the customerChatController.
// This disconnected the customer. No action can be permformed on this chat anymore by the customer.
// Once this method is called the chatSession is obsolete and cannot be used anymore.
chatSession.disconnectParticipant();
```

## API Definition

### `chatSession.sendMessage`
`Method param:` args
```
args = {
    message: "string" //required: *yes*,* *min len: 1, max len: 1024
    contentType: "string", //required: *yes*, only valid string for message is text/plain
    metadata: 
}
```
`Exceptions:`
IllegalArgumentException
(API takes care of other exceptions)

### `chatSession.sendEvent`
`Method param:` args
```
args = {
    content: "string", //required: no, nullable, reserved for future use; // min len: 1, max len: 1024
    contentType: "string", //required: *yes*, custom type depicting chat events
             // supported types ->
             //  "application/vnd.amazonaws.connect.event.typing 
             // | "application/vnd.amazonaws.connect.event.participant.joined
             // | "application/vnd.amazonaws.connect.event.participant.left
             // | "application/vnd.amazonaws.connect.event.transfer.succeed
             // | "application/vnd.amazonaws.connect.event.transfer.failed
             // | "application/vnd.amazonaws.connect.event.chat.ended
             // *Must* be one of the above strings, or an IllegalArgumentException will be thrown
    metadata: //required: no
}
```
`Exceptions:`
IllegalArgumentException
(API takes care of other exceptions)

### `chatSession.getTranscript`
`Method param:` args
```
args = {
   contactId: "string" //min len: 1, max len:256, required: No
   maxResults: number, //required: no, Nullable, min:0, max: 100
   nextToken: "string", //required: no, min len:1, max len: 1000, 
   scanDirection: "string", //required: no, enum string to indicate FORWARD | BACKWARD
   sortOrder: "string", //required: no, enum string to indicate DESCENDING | ASCENDING
   startPosition: { // required: no
      id: "string", //min len: 1, max len:256
      mostRecent: number, // min:0, max: 100
      absoluteTime: "string" // String matching ISO 8601 format: "yyyy-MM-ddThh:mm:ssZ"
   }
   metadata: //required: no
} metadata: //required: no
```
`Exceptions:`
No Exceptions (API takes care of other exceptions)
