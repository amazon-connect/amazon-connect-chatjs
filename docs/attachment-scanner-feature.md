## Enabling Attachment Scanner

You can configure Amazon Connect to scan attachments that are sent during a chat or uploaded to a case. You can scan attachments by using your preferred scanning application. For example, you can scan attachments for malware before they are approved to be shared between participants of a chat.

Learn more about attachment scanning: https://docs.aws.amazon.com/connect/latest/adminguide/setup-attachment-scanning.html

Amazon Connect will send the result (APPROVED | REJECTED) of the scanned attachment as a message in the websocket. To render it in your chat, you can use the following example code in the onMessage handler

```js

this.client.onMessage(event => {
  console.log(event.data);
  //  {
  //     "AbsoluteTime": "2025-05-24T21:42:55.867Z",
  //     "Attachments": [
  //         {
  //             "ContentType": "image/png",
  //             "AttachmentId": "asdfasdfasdfsadf",
  //             "AttachmentName": "Screenshot 2025-05-24 at 2.42.48 PM.png",
  //             "Status": "APPROVED"
  //         }
  //     ],
  //     "Id": "86a061a2-f99c-4691-a63e-47d145628a80",
  //     "Type": "ATTACHMENT",
  //     "ParticipantId": "4393212f-4481-4c7d-8184-5be9d811d7ce",
  //     "DisplayName": "Spencer",
  //     "ParticipantRole": "CUSTOMER",
  //     "InitialContactId": "f50e4cc0-b825-4da7-849a-27fa75f993de",
  //     "ContactId": "7d007f43-a0cc-4efb-abc9-628fc216e6d5"
  // }
  const attachmentStatus = event.data.Attachments?.[0]?.Status;

  if (attachmentStatus === 'REJECTED') {
    renderAttachmentError(attachmentStatus) //your custom implementation
  }
});
```
