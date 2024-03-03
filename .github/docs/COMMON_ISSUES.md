# Common ChatJS Issues

List of common ChatJS issue/bugs and solutions

## 001 - Network or WebSocket disconnected - missing Agent messages

During a chat session, the end-customer using a chat application loses network/websocket connection. They re-gain connection shortly after, but Agent messages are failing to render in chat

<img width="973" alt="Screenshot 2024-03-02 at 5 57 50 PM" src="https://github.com/amazon-connect/amazon-connect-chatjs/assets/150714337/50d8f1c2-6497-4e22-a4ba-7244c7631cee">

If the **end-customer chat UI** loses websocket/network connection, it must:

1. Re-establish the websocket connection (to receive future incoming messages again)
2. Make a [chatSession.getTranscript](https://github.com/amazon-connect/amazon-connect-chatjs?tab=readme-ov-file#chatsessiongettranscript) (API: [ GetTranscript](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html)) request (to retrieve all missing messages that were sent while end-customer was disconnected)

If the agent sends a message while the end-customer chat UI is disconnected, it is successfully stored in the Connect backend (CCP is working as expected, messages are all recorded in transcript), but the client's device was unable to receive it. When the client reconnects to the websocket connection, there is a gap in messages. Future incoming messages will appear again from the websocket, but the gap messages are still missing unless the code explicitly makes a [GetTranscript](https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html) call.

### Solution

The [chatSession.onConnectionEstablished](https://github.com/amazon-connect/amazon-connect-chatjs?tab=readme-ov-file#chatsessiononconnectionestablished) event handler may help, which is triggered when websocket re-connects. ChatJS has built-in heartbeat and retry logic for the websocket connection. Since ChatJS is not storing the transcript though, **Custom chat UI** code must manually fetch the transcript again

```js
import "amazon-connect-chatjs";

const chatSession = connect.ChatSession.create({
  chatDetails: {
    ContactId: "abc",
    ParticipantId: "cde",
    ParticipantToken: "efg",
  },
  type: "CUSTOMER",
  options: { region: "us-west-2" },
});

// Triggered when the websocket reconnects
chatSession.onConnectionEstablished(() => {
  chatSession.getTranscript({
    scanDirection: "BACKWARD",
    sortOrder: "ASCENDING",
    maxResults: 15,
    // nextToken?: nextToken - OPTIONAL, for pagination
  })
    .then((response) => {
      const { initialContactId, nextToken, transcript } = response.data;
      // ...
    })
    .catch(() => {})
});
```

```js
function loadLatestTranscript(args) {
    // Documentation: https://github.com/amazon-connect/amazon-connect-chatjs?tab=readme-ov-file#chatsessiongettranscript
    return chatSession.getTranscript({
        scanDirection: "BACKWARD",
        sortOrder: "ASCENDING",
        maxResults: 15,
        // nextToken?: nextToken - OPTIONAL, for pagination
      })
      .then((response) => {
        const { initialContactId, nextToken, transcript } = response.data;
        
        const exampleMessageObj = transcript[0];
        const {
          DisplayName,
          ParticipantId,
          ParticipantRole, // CUSTOMER, AGENT, SUPERVISOR, SYSTEM
          Content,
          ContentType,
          Id,
          Type,
          AbsoluteTime, // sentTime = new Date(item.AbsoluteTime).getTime() / 1000
          MessageMetadata, // { Receipts: [{ RecipientParticipantId: "asdf" }] }
          Attachments,
          RelatedContactid,
        } = exampleMessageObj;

        return transcript // TODO - store the new transcript somewhere
      })
      .catch((err) => {
        console.log("CustomerUI", "ChatSession", "transcript fetch error: ", err);
      });
}
```

> Additionally, it's possible to refer to the open source implementation: https://github.com/amazon-connect/amazon-connect-chat-interface/blob/c88f854073fe6dd45546585c3bfa363d3659d73f/src/components/Chat/ChatSession.js#L408
