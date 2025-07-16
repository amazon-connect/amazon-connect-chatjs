## Handling File Attachments in Chat

For managing attachments in ChatJS, simply call `sendAttachment({ attachment: File })` and `downloadAttachment()`. Under the hood, this uses [Amazon Connect Participant Service
](https://docs.aws.amazon.com/connect/latest/APIReference/API_Operations_Amazon_Connect_Participant_Service.html) [[documentation](https://docs.aws.amazon.com/connect/latest/APIReference/working-with-acps-api.html)]

Send images, docs, wavs, and more. Refer to [File types supported for attachments to cases or chats](https://docs.aws.amazon.com/connect/latest/adminguide/feature-limits.html#feature-limits-chat)

### Prerequisites

- ["Enable attachments in your CCP so customers and agents can share and upload files
"](https://docs.aws.amazon.com/connect/latest/adminguide/enable-attachments.html)

### Implementation

**Receive Attachments**

```typescript
chatSession.onMessage((event) => {
  if (message.contentType === "application/vnd.amazonaws.connect.message.attachment") {
        const attachmentItem = event.data.Attachments[0];
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
  }
});
```

**Download Attachments**

```typescript
chatSession.downloadAttachment({
  attachmentId: attachmentItem.AttachmentId
}).then((awsSDKResponse) => {
  console.log('Download response:', awsSDKResponse);
  const attachmentBlob = awsSDKResponse;
  /*
    Attachment Object - This is the actual file that will be downloaded by either agent or end-customer.
    {
      lastModified: long
      name: "string"
      size: long
      type: "string"
      webkitRelativePath: "string"
    }
  */

  // Create a download link for the Blob
  const downloadUrl = URL.createObjectURL(attachmentBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = attachmentItem.AttachmentName;
  downloadLink.style.display = 'none';

  document.body.appendChild(downloadLink);
  downloadLink.click();

  setTimeout(() => {
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(downloadUrl);
  }, 100);
}).catch(error => {
  console.error('Error downloading attachment:', error);
});
```

**Send Attachments**

```js
await chatSession.sendAttachment({
  attachment: attachment // type: File [HTML file object, see https://developer.mozilla.org/en-US/docs/Web/API/File]
  metadata: { foo: "bar" }, // optional
});
// supported files: .csv, .doc, .docx, .jpeg, .jpg, .pdf, .png, .ppt, .pptx, .txt, .wav, .xls, .xlsx
// max size: 20MB
// source: https://docs.aws.amazon.com/connect/latest/adminguide/feature-limits.html#feature-limits-chat

// Example usage
var input = document.createElement('input');
input.type = 'file';
input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  chatSession.sendAttachment({ attachment: file })
});
```
