# Configure ChatJS WebSocket Manager for React Native Environment

> 📌 Important: ensure you are using `amazon-connect-chatjs >= v1.5.0` (`>=1.5.0 <=3.0.2`)

ChatJS is officially supported in React Native environments, but requires additional configuration. You'll need to pass in a custom network status hook, since the browser-based `window.navigator.onLine` isn't available.

To configure ChatJS WebSocketManager for React Native environments, it's recommended to use the [react-native-netinfo](https://github.com/react-native-netinfo/react-native-netinfo) library, and pass this to ChatJS `webSocketManagerConfig` input.

For a boilerplate React Native demo application, check out the [Amazon Connect React Native ChatJS Example](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/mobileChatExamples/connectReactNativeChat).

```sh
npm install amazon-connect-chatjs@latest
npm install @react-native-community/netinfo@latest
```

```diff
// MyChatUI.jsx

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import "amazon-connect-chatjs"; // >= v1.5.0 - imports the "window.connect"
+ import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

const MyChatUI = () => {
  useEffect(() => {
+   window.connect.ChatSession.setGlobalConfig({
+       webSocketManagerConfig: {
+         isNetworkOnline: async () => {
+           const state = await NetInfo.fetch();
+           return state.isConnected;
+         }
+       }
+     });

      // Your proxy backend makes StartChatContact API request: https://docs.aws.amazon.com/connect/latest/APIReference/API_StartChatContact.html
      // Boilerplate backend: https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/cloudformationTemplates/startChatContactAPI
     const startChatResponse = await fetch('url-to-my-chat-backend').then(response => response.data);

      // Initialize ChatJS session
      const chatSession = window.connect.ChatSession.create({
      chatDetails: {
        contactId: startChatResponse.ContactId,
        participantId: startChatResponse.ParticipantId,
        participantToken: startChatResponse.ParticipantToken,
      },
      options: { region: '<AWS_REGION>' },
      type: "CUSTOMER",
      disableCSM: true // CSM is an internal feature, safe to disable
    })

    // Connect to chat session WebsSocket connection
    await chatSession.connect();
  }, [])
}
```

## Troubleshooting

### WebSocket Not Working on Android Device

Ensure you have enable permissions to allow WebSocket connections.

For SDK version >= 23, Android requires the following line in `AndroidManifest.xml`:

```xml
<uses-permission
    android:name="android.permission.ACCESS_NETWORK_STATE"
/>
```
### Enable ChatJS logging

```js
import "amazon-connect-chatjs"; // imports `window.connect`

window.connect.ChatSession.setGlobalConfig({
  // loggerConfig: { useDefaultLogger: false }, // DISABLE
  loggerConfig: { useDefaultLogger: true }, // ENABLE
});
```

### Connection Management

```js
chatSession.onConnectionLost(async () => {
  console.log('Websocket lost connection');
  // Implement reconnection logic
  await chatSession.connect();
});

chatSession.onConnectionEstablished(() => {
  console.log('WebSocket connection has been established/reestablished');
});

chatSession.onConnectionBroken(event => {
  console.log('WebSocket connection is broken or terminated');
});
```

### Network Health Checks

```js
chatSession.onDeepHeartbeatSuccess(() => {
  console.log('WebSocket connection healthy');
});

chatSession.onDeepHeartbeatFailure(() => {
  console.log('WebSocket connection issues detected');
});
```

### CSM not initialized

Client-side-metric (CSM) is an internal feature. This functionality is enabled by default but completely safe to disable.

```log
ChatJS-csmService: Failed to addCountAndErrorMetric csm:  ReferenceError: Property 'csm' doesn't exist undefined
ChatJS-csmService: Failed to addLatencyMetric csm:  ReferenceError: Property 'csm' doesn't exist undefined
addCSMCountMetric: CSM not initialized TypeError: Cannot read properties of null (reading 'Metric')
```

**Fix:**

```js
connect.ChatSession.create({
  // ...
  disableCSM: true
})
```
