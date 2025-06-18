## Enabling Persistent Chat

No changes are need are needed to ChatJS for enabling Persistent Chat. You'll need to update your backend making the [StartChatContact](https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html) request, or the sample [startChatContactAPI](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/cloudformationTemplates/startChatContactAPI) lambda if you deployed the boilerplate CloudFormation template.

### Overview

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
