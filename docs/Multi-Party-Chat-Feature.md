# Multi-party Chat Feature

**Scope:**: `AGENT` chat sessions, Custom CCP
**Requires**:
  - `amazon-connect-streamsjs@>=2.18.1`
  - `amazon-connect-chatjs@>=v1.4.0`

Multi-Party (Conference) Chat is currently supported in Amazon Connect Chat. This feature utilizes **Quick Connects**, and [StreamsJS](https://github.com/amazon-connect/amazon-connect-streams) provides the methods to manage this.

### Additional Details

- __StreamsJS__ (`amazon-connect-streams`)

  - Provides core functionality for managing contact interactions
  - Offers the `contact.addParticipant()` method for triggering **Quick Connects**
  - Handles contact lifecycle events (accept, connect, etc.)

- __ChatJS__ (`amazon-connect-chatjs`)

  - Manages chat-specific interactions
  - Provides methods for sending messages, managing chat sessions
  - Handles chat-specific events like typing indicators, message delivery

- **Participant Limit**: Up to 6 participants per chat session
  - 1 customer
  - 1 primary agent
  - 4 additional agents
- **Availability**:
  - CCPv2 (Contact Control Panel v2)
  - Agent workspace
  - Custom CCPs using Amazon Connect StreamsJS
- **Limitations**:
  - Read/delivered receipts are not supported
  - Not available in AWS GovCloud (US-West) Region

## Implementing Amazon Connect Multi-Party Chat With StreamsJS and ChatJS

## 1. Enable the Multi-Party Chat Feature

Follow these steps to activate multi-party chat functionality in your Amazon Connect instance:

1. Log in to the AWS Management Console
2. Select your Amazon Connect instance
3. Navigate to **Telephony** in the left navigation menu
4. Locate the **Enhanced contact monitoring capabilities** section
5. Check the box for **Enable Multi-Party Chats and Enhanced Monitoring for Chat**
6. Click **Save changes**

![Multi-Party Chat Configuration](https://github.com/user-attachments/assets/101686ae-9c92-4ec5-8424-718c05b6e7af)

> **Note**: Enabling this feature allows for more complex chat routing and monitoring capabilities within your contact center.

## 2. Configure Profiles and Quick Connects

Configuring multi-party chat requires careful setup of user profiles, routing, and quick connects:

### 2.1 Create Quick Connect for Agent Transfer

1. Access Amazon Connect admin console
2. Navigate to **Routing** > **Quick Connects**
3. Click **Add new Quick Connect**
4. Configure the Quick Connect with these details:
   - **Name**: Descriptive transfer name (e.g., "transfer-to-agent-1")
   - **Type**: Select "User"
   - **User**: Choose the target agent's username
   - **Contact Flow**: Select "Default agent transfer"

<img width="1094" alt="Image" src="https://github.com/user-attachments/assets/887347a4-b690-4008-b6ad-420af1cb0594" />

<img width="939" alt="Image" src="https://github.com/user-attachments/assets/ac1ed998-9618-4933-bfe1-93b4c49d7c0c" />

### 2.2 Set Up Security and Routing Profiles

1. Go to **Users** > **User management**
2. Edit the target agent's profile
3. Verify and configure:
   - **Security Profile**:
     * Ensure "Quick Connects" permission is enabled
     * Confirm routing capabilities
   - **Routing Profile**:
     * Assign to "Basic Routing Profile" or appropriate profile

<img width="1207" alt="Image" src="https://github.com/user-attachments/assets/f64b71e7-64c5-48f4-9b6f-a53242272f3d" />

### 2.3 Update Queue Configuration

1. Navigate to **Routing** > **Queues**
2. Select the relevant queue (e.g., **Basic Queue**)
3. Configure Quick Connect settings:
   - Add the newly created Quick Connect
   - Verify transfer and routing permissions
4. Click **Save changes**

![Queue Settings](https://github.com/user-attachments/assets/91c6c567-3621-421d-8e06-7b12bc0f6e1c)

## 3. (Optional) Test End-to-end Multi-Party Chat Functionality

Consult the official Amazon Connect multi-party chat documentation:
https://docs.aws.amazon.com/connect/latest/adminguide/multi-party-chat.html

https://github.com/user-attachments/assets/ecbc7a60-0737-480d-b381-169b6ca8eb51

## 4. Get QuickConnect ARN

When editing a Quick Connect in the Amazon Connect Admin console, the URL will have this format:
```
https://instance.my.connect.aws/transfer-dests/edit?id=asdfsadf-0f37-4056-9d50-d5512c2e2879
```

To retrieve the **QuickConnect ARN**, you have two methods:

1. **Browser Method**:
   - Copy the `id` from the edit URL
   - Open this page in your browser:
     ```
     https://instance.my.connect.aws/quick-connect-management/quick-connects/<id>
     ```

2. **API Method**:
   - Use the [DescribeQuickConnect API](https://docs.aws.amazon.com/connect/latest/APIReference/API_DescribeQuickConnect.html)

Example API Response:
```json
{
  "QuickConnect": {
    "QuickConnectARN": "arn:aws:connect:us-west-2:123456789101:instance/.../transfer-destination/...",
    "QuickConnectId": "...",
    "Name": "Transfer-to-agent-1"
  }
}
```

## 5. StreamsJS Changes for the Agent Chat UI

Build out the Agent Chat UI with StreamsJS and ChatJS by using the `contact.addParticipant()` method to dynamically add participants to an ongoing chat session.

> Full method documentation: [Amazon Connect Streams GitHub](https://github.com/amazon-connect/amazon-connect-streams/blob/master/Documentation.md)

```diff
  // Initialize Connect CCP
  connect.core.initCCP({
    containerDiv: 'containerDiv',
    ccpUrl: 'https://your-instance-name.awsapps.com/connect/ccp-v2/',
    loginPopup: true
  });

  // Subscribe to contact events
  connect.contact(function(contact) {
    if (contact.getType() === connect.ContactType.CHAT) {
      // Automatically accept chat
      contact.accept();

+     // Programmatically trigger the QuickConnect to add another agent to the chat
+     const endpoint = {
+       id: '98979-asdf-asdf-asdf-sadf',       // QuickConnectId
+       endpointARN: "arn:aws:connect:us-west-2:12345678901:instance/asdf-asfd-asdf-1234-asdf/transfer-destination/98979-asdf-asdf-asdf-sadf", // QuickConnectARN
+       type: "agent",                         // IMPORTANT: Must be one of: phone_number, agent, queue
+       name: "Transfer-to-agent-2",           // QuickConnect Name
+     };
+
+     // Add participant using StreamsJS
+     // Reference: https://github.com/amazon-connect/amazon-connect-streams/blob/master/src/index.d.ts#L2107
+     contact.addParticipant(endpoint, {
+       success: () => {
+         console.log('Participant added successfully');
+       },
+       failure: (reason) => {
+         console.error('Failed to add participant:', reason);
+       }
+     });
    }
  });
```

## Example Implementation

Here's a working proof-of-concept file you can run locally, e.g. `http://localhost:8080/index.html`

Before running the example, you must allow-list the domain to run on `localhost:PORT`. Follow these steps:

1. Login to your AWS Account
2. Navigate to the Amazon Connect console
3. Click on your instance name
4. Click the "Application integration" link on the left sidebar
5. Click "Add Origin"
6. Enter the domain URL: `http://localhost:8080`

<img width="1055" alt="Image" src="https://github.com/user-attachments/assets/7ec090a7-9a49-4022-b2d1-dc2575749285" />

#### Code

https://github.com/user-attachments/assets/a4c08c6d-7911-4b9b-8435-346981dcff45

```bash
node --version
# >= v16.x

npx live-server --port=8080 chatjs-streamsjs-multiparty-example.html
```

```html
<!-- chatjs-streamsjs-multiparty-example.html -->
<!--
# Amazon Connect Custom Agent Chat UI

## Overview
Custom Agent Chat UI integrating ChatJS and StreamsJS for Amazon Connect Chat

- StreamsJS: https://github.com/amazon-connect/amazon-connect-streams
- ChatJS: https://github.com/amazon-connect/amazon-connect-chatjs
- AWS Documentation: https://docs.aws.amazon.com/connect/latest/adminguide/chat-with-connect-contacts.html

## Prerequisites
- Amazon Connect Instance
- Login credentials for a user profile assigned to "Agent"

## Configuration Steps
1. Allowlisting
   - Login to your AWS Account, then navigate to the Amazon Connect console.
   - Click the instance name of the instance for which you would like to allowlist pages to load the settings page for your instance.
   - Click the "Application integration" link on the left.
   - Click "Add Origin", then enter a domain URL: http://localhost:8080

2. Configuration Updates
   - Update the following values in the script:
     * `INSTANCE_URL`: Your Amazon Connect instance URL
     * `REGION`: Your AWS region
     * `QUICK_CONNECT_ENDPOINT`: Your QuickConnect id + ARN

## Local Testing Instructions
1. Host the HTML file in a local browser
   \```
   npx live-server --port=8080 chatjs-streamsjs-multiparty-example.html
   \```
   - Access URL: http://localhost:8080

2. Login Process
   - Open Contact Control Panel (CCP)
   - Login with your Agent username/password

3. Chat Interaction
   - Keep CCP tab open
   - In a second browser tab, launch Amazon Connect Test Chat Page: https://<instance-alias>.my.connect.aws/test-chat
   - Open the Customer widget
   - Back on CCP tab, wait for an incoming chat contact, click "Accept"
-->
<!DOCTYPE html>
<html>

<head>
  <meta charset="UTF-8">
  <title>Agent Chat UI [Amazon Connect]</title>
  <style>
    body {
      display: flex;
    }

    #prebuilt-agent-ui-iframe,
    #chat-ui-container {
      width: 400px;
      height: 800px;
    }

    #chat-ui-container {
      font-family: Arial, sans-serif;
      border: 1px solid #ddd;
      padding: 15px;
      border-radius: 5px;
      margin: 20px auto;
    }

    #custom-agent-chat-transcript {
      height: 300px;
      overflow-y: auto;
      background-color: #f8f8f8;
      padding: 10px;
      margin-top: 20px;
      width: 100%;
      box-sizing: border-box;
    }

    #custom-agent-chat-transcript::after {
      content: "";
      display: table;
      clear: both;
    }

    .message {
      margin: 5px 0;
      padding: 8px;
      border-radius: 5px;
      max-width: 80%;
      word-wrap: break-word;
      clear: both;
    }

    .incoming-message {
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      float: left;
      text-align: left;
    }

    .outgoing-message {
      background-color: #0084ff;
      color: white;
      border: 1px solid #0073e6;
      float: right;
      text-align: right;
    }

    #message-input-container {
      display: flex;
      margin-top: 15px;
    }

    #messageInput {
      flex-grow: 1;
      margin-right: 5px;
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    button {
      padding: 8px 15px;
      border-radius: 4px;
      cursor: pointer;
      background-color: #0084ff;
      color: white;
      border: none;
    }

    button:disabled {
      background-color: #ccc;
    }
  </style>
</head>

<body>
  <div id="prebuilt-agent-ui-iframe"></div>
  <div id="chat-ui-container">
    <h3>Custom Agent Chat UI (ChatJS + StreamsJS)</h3>
    <div id="custom-agent-chat-transcript"></div>
    <div id="message-input-container" style="display: none">
      <input type="text" id="messageInput" placeholder="Type your message..." disabled>
      <button id="sendMessageButton" disabled>Send</button>
      <button id="quick-connect-btn">Quick Connect</button>
    </div>
  </div>

  <script type="module">
    // Option 1: import ChatJS and StreamJS directly from npm (order is important)
    import "https://unpkg.com/amazon-connect-streams@2.18.1"; // imports `window.connect.*`
    import "https://unpkg.com/amazon-connect-chatjs@3.0.5"; // also imports `window.connect.*`

    // Option 2: Import bundle files
    // import "amazon-connect-streams.js";
    // import "amazon-connect-chat.js";

    const INSTANCE_URL = "https://<INSTANCE_ALIAS>.my.connect.aws/ccp-v2?visual-refresh=true";
    const REGION = 'us-west-2';
    const MAX_TRANSCRIPT_MESSAGES = 15;

    window.onload = async function () {
      // DOM element references
      const elements = {
        prebuiltAgentUI: document.getElementById("prebuilt-agent-ui-iframe"),
        transcript: document.getElementById("custom-agent-chat-transcript"),
        messageInput: document.getElementById("messageInput"),
        sendButton: document.getElementById("sendMessageButton"),
        inputContainer: document.getElementById("message-input-container"),
      };

      // Initialize Connect CCP and set up handlers
      await connect.core.initCCP(elements.prebuiltAgentUI, {
        ccpUrl: INSTANCE_URL,
        region: REGION,
        loginPopup: true,
      });

      connect.ChatSession.setGlobalConfig({
        loggerConfig: { useDefaultLogger: true },
        region: REGION,
      });

      // Handle new contacts
      connect.contact(contact => {
        if (contact.getType() === connect.ContactType.CHAT) {
          // Automatically accept chat
          contact.accept();
        }

        contact.onAccepted(() => initializeChatContact(contact));

        const triggerQuickConnect = () => {
          // Extract Quick Connect ID from edit URL: https://instance.my.connect.aws/transfer-dests/edit?id=<id>
          // Use ID to retrieve the QuickConnect ARN: https://instance.my.connect.aws/quick-connect-management/quick-connects/<id>
          // Alternatively, use DescribeQuickConnect API: https://docs.aws.amazon.com/connect/latest/APIReference/API_DescribeQuickConnect.html
          const QUICK_CONNECT_ENDPOINT = {
            id: 'asdf-asdf-asdf-QUICK_CONNECT_ID', // QuickConnectId
            endpointARN: "arn:aws:connect:us-west-2:<ACCOUNT_ID>:instance/asdf-30ef-1234-1234-1234-asdf/transfer-destination/asdf-asdf-asdf-QUICK_CONNECT_ID", // QuickConnectARN
            type: "agent", // phone_number, agent, queue
            name: "Transfer-to-agent-2", // QuickConnect Name
          };
          // StreamsJS reference: https://github.com/amazon-connect/amazon-connect-streams/blob/f4d77422047ec1f7483167a09d223c5385629c1c/src/index.d.ts#L2107
          contact.addParticipant(QUICK_CONNECT_ENDPOINT, { success: () => { }, failure: (reason) => { console.error(reason); } });
        };
        const quickConnectBtn = document.getElementById('quick-connect-btn');
        quickConnectBtn.addEventListener('click', triggerQuickConnect);
      });

      // Check for existing contacts
      connect.agent(agent => {
        agent.onRefresh(() => {
          agent.getContacts().forEach(contact => {
            const contactStatus = contact.getStatus().type;
            const isActiveChat =
              contact.getType() === connect.ContactType.CHAT &&
              (contactStatus === connect.ContactStateType.CONNECTED ||
                contactStatus === connect.ContactStateType.ACCEPTED);

            if (isActiveChat) initializeChatContact(contact);
          });
        });
      });

      /**
       * Initialize a chat contact and set up the UI
       */
      async function initializeChatContact(contact) {
        if (contact.getType() !== connect.ContactType.CHAT) return;

        const agentConnection = contact.getConnections().find(
          conn => conn.getType() === connect.ConnectionType.AGENT
        );

        let chatSession;
        try {
          chatSession = await agentConnection.getMediaController();

          if (!chatSession) {
            chatSession = connect.ChatSession.create({
              chatDetails: agentConnection.getMediaInfo(),
              options: { region: REGION },
              type: connect.ChatSession.SessionTypes.AGENT,
              websocketManager: connect.core.getWebSocketManager()
            });
            await chatSession.connect();
          }

          setupChat(chatSession, elements);
        } catch (error) {
          console.error('Error getting chat session:', error);
        }
      }

      /**
       * Set up the chat UI and handlers
       */
      function setupChat(chatSession, elements) {
        if (!chatSession) return;

        // Show and enable UI elements
        elements.transcript.style.display = "block";
        elements.transcript.style.visibility = "visible";
        elements.inputContainer.style.display = "flex";
        elements.messageInput.disabled = false;
        elements.sendButton.disabled = false;

        // Set up message sending
        const sendMessage = async () => {
          const message = elements.messageInput.value.trim();
          if (message) {
            try {
              await chatSession.sendMessage({ contentType: "text/plain", message });
              elements.messageInput.value = '';
            } catch (error) {
              console.error('Error sending message:', error);
            }
          }
        };

        elements.sendButton.addEventListener('click', sendMessage);
        elements.messageInput.addEventListener('keypress', e => {
          if (e.key === 'Enter') sendMessage();
        });

        // Set up chat session handlers
        chatSession.onConnectionEstablished(() => {
          // Load previous messages
          chatSession.getTranscript({
            scanDirection: "BACKWARD",
            sortOrder: "ASCENDING",
            maxResults: MAX_TRANSCRIPT_MESSAGES
          }).then(response => {
            if (response.data?.Transcript) {
              response.data.Transcript.forEach(msg => renderMessage(msg, chatSession, elements));
            }
          }).catch(error => console.error("Error loading transcript:", error));
        });

        /**
         * Subscribes an event handler that triggers whenever a message or an event (except for `application/vnd.amazonaws.connect.event.typing`) is created by any participant.
         * @param {
            chatDetails: Object,
            data: {
              AbsoluteTime: string,
              Content?: string,
              ContentType: string,
              DisplayName?: string,
              Id: string,
              ParticipantId?: string,
              ParticipantRole?: "AGENT" | "CUSTOMER" | "SYSTEM",
              Type: "MESSAGE" | "EVENT" | "ATTACHMENT" | "CONNECTION_ACK",
              ContactId?: string,
              InitialContactId?: string
            }
        } event
        */
        chatSession.onMessage(event => {
          if (event.data) renderMessage(event.data, chatSession, elements);
        });

        /**
         * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.typing" event is created by any participant.
         * @param {
            AbsoluteTime?: string,
            ContentType: "application/vnd.amazonaws.connect.event.typing",
            Type?: string,
            ParticipantId?: string,
            DisplayName?: string,
            ParticipantRole?: "AGENT" | "CUSTOMER" | "SYSTEM",
            InitialContactId?: string
        } event.data
        */
        chatSession.onTyping((event) => {
          // Handle typing indicator
          renderMessage({
            "AbsoluteTime": "2025-05-23T06:01:24.287Z",
            "ContentType": "text/plain",
            "Content": "...",
            "Id": "e69634e9-2b31-4598-923e-5b2be62d436b",
            "Type": "EVENT",
            "ParticipantId": "5b370166-c0ee-4e23-ac1b-87ceffa611c4",
            "DisplayName": "Customer",
            "ParticipantRole": "CUSTOMER",
            "InitialContactId": "3358be3e-368d-4cde-ae92-352f44c35440"
          }, chatSession, elements);
        })

        /**
         * Subscribes an event handler that triggers when a read message event is received from the customer or agent.
         * @param {
            AbsoluteTime?: string,
            ContentType: "application/vnd.amazonaws.connect.event.message.read",
            Type?: string,
            ParticipantId?: string,
            DisplayName?: string,
            ParticipantRole?: "AGENT" | "CUSTOMER" | "SYSTEM",
            InitialContactId?: string
         } event.data
         */
        chatSession.onReadReceipt((event) => {
          // TODO - handle message receipt
        })

        /**
         * Subscribes an event handler that triggers when a delivered message event is received from the customer or agent.
         * @param {
            AbsoluteTime?: string,
            ContentType: "application/vnd.amazonaws.connect.event.message.delivered",
            Type?: string,
            ParticipantId?: string,
            DisplayName?: string,
            ParticipantRole?: "AGENT" | "CUSTOMER" | "SYSTEM",
            InitialContactId?: string
         } event.data
         */
        chatSession.onDeliveredReceipt((event) => {
          // TODO - handle message receipt
        })
      }

      /**
       * Render a message in the chat UI
       */
      function renderMessage(message, chatSession, elements) {
        if (message.ContentType === "text/plain" || message.ContentType === "text/markdown") {
          const messageElement = document.createElement("div");
          messageElement.className = "message";

          const isFromAgent = message.ParticipantId === chatSession.getChatDetails().participantId;
          messageElement.classList.add(isFromAgent ? "outgoing-message" : "incoming-message");

          const displayName = message.DisplayName || (isFromAgent ? 'Agent' : 'Customer');
          const content = document.createElement("div");
          const messageContent = message.Content || message.content;
          content.textContent = `${displayName}: ${messageContent}`;
          messageElement.appendChild(content);

          messageElement.id = `msg-${message.Id}`;
          messageElement.title = new Date(message.AbsoluteTime).toLocaleTimeString();

          elements.transcript.appendChild(messageElement);
          elements.transcript.scrollTop = elements.transcript.scrollHeight;
        }
      }
    };
  </script>
</body>

</html>
```
