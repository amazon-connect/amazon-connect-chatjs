# About
The Amazon Connect Chat javascript library (ChatJS) gives you the power to build your own chat widget to customize the chat experience. This can be used for both the Agent User Interface, in conjunction with [Amazon Connect Streams](https://github.com/aws/amazon-connect-streams) and for the customer chat interface. 

There is a [Chat UI reference implementation](https://github.com/amazon-connect/amazon-connect-chat-ui-examples) here. This will help you deploy an API Gateway and Lambda function for initiating chat from your webpage. From there you can use the ChatJS library to build a custom widget,

# Learn More
To learn more about Amazon Connect and its capabilities, please check out
the [Amazon Connect User Guide](https://docs.aws.amazon.com/connect/latest/userguide/).

## Getting Started

### Downloading ChatJS

```
$ git clone https://github.com/amazon-connect/amazon-connect-chatjs
```
### Building ChatJS
1. Install latest LTS version of [NodeJS](https://nodejs.org)
2. Checkout this package into workspace and navigate to root folder
3. `npm install`
4. To build (non-minified):
    1. `npm run dev` for a non-minified build.
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
