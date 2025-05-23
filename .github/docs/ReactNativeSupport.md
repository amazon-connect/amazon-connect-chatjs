# Configure ChatJS WebSocket Manager for React Native Environment

ChatJS relies on browser's `window.navigator.onLine` for network monitoring, which isn't available in React Native (Hermes JS Engine). Instead, you'll need to configure ChatJS to use React Native's NetInfo API for network status checks.

> 📌 Important: ensure you are using `amazon-connect-chatjs >= v1.5.0`

For a boilerplate React Native demo application, check out the [Amazon Connect React Native ChatJS Example](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/mobileChatExamples/connectReactNativeChat).

```diff
// MyChatUI.jsx

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import "amazon-connect-chatjs"; // >= v1.5.0 - imports the "window.connect" class
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';

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
<!--
# React Native Support

> ‼️ Additional configuration is required to support ChatJS in React Native applications - see ["Configuration"](#configuration)


## Demo

A demo application implementing basic ChatJS functionality is available in the ui-examples repository: [connectReactNativeChat](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/connectReactNativeChat)


## Client Side Metrics (CSM) Support

> ⚠️ NOT CURRENTLY SUPPORTED - For more details please refer to the [tracking issue](https://github.com/amazon-connect/amazon-connect-chatjs/issues/171)

The out-of-box ChatJS client side metrics are not currently supported in React Native. ChatJS is officially supported for browser environments, and may run into issues accessing the `document` DOM API.

You can safely disable CSM without affecting other behavior:

```diff
this.session = connect.ChatSession.create({
  chatDetails: startChatDetails,
+ disableCSM: true,
  type: 'CUSTOMER',
  options: { region },
});
```

## Configuration

Use `amazon-connect-chatjs@^1.5.0` and customize the global configuration:

```
connect.ChatSession.setGlobalConfig({
  webSocketManagerConfig: {
    isNetworkOnline: () => true, // default: () => navigator.onLine
  }
});
```

To further customize the `isNetworkOnline` input, see the options below:

#### Override Browser Network Health Check

If running ChatJS in mobile React Native environment, override the default network online check:

> `amazon-connect-websocket-manager.js` depencency will use `navigator.onLine`. Legacy browsers will always return `true`, but unsupported or mobile runtime will return `null/undefined`.

```js
/**
 * `amazon-connect-websocket-manager.js` depencency will use `navigator.onLine`
 * Unsupported or mobile runtime will return `null/undefined` - preventing websocket connections
 * Legacy browsers will always return `true` [ref: caniuse.com/netinfo]
 */
const customNetworkStatusUtil = () => {
  if (navigator && navigator.hasOwnProperty("onLine")) {
    return navigator.onLine;
  }

  return true;
}

connect.ChatSession.setGlobalConfig({
  webSocketManagerConfig: {
    isNetworkOnline: customNetworkStatusUtil,
  }
});
```

#### Custom Network Health Check

Extending this, device-native network health checks can be used for React Native applications.

1. First, install the `useNetInfo` react hook:

```sh
$ npm install --save @react-native-community/netinfo
# source: https://github.com/react-native-netinfo/react-native-netinfo
```

2. Make sure to update permissions, Android requires the following line in `AndroidManifest.xml`: (for SDK version after 23)

```xml
<uses-permission
    android:name="android.permission.ACCESS_NETWORK_STATE"
/>
```

3. Set up the network event listener, and pass custom function to `setGlobalConfig`:

> Note: To configure `WebSocketManager`, `setGlobalConfig` must be invoked

```js
import ChatSession from "./ChatSession";
import NetInfo from "@react-native-community/netinfo";
import "amazon-connect-chatjs"; // ^1.5.0 - imports global "connect" object 

let isOnline = true;

/** 
 * By default, `isNetworkOnline` will be invoked every 250ms
 * Should only current status, and not make `NetInfo.fetch()` call
 * 
 * @return {boolean} returns true if currently connected to network
*/
const customNetworkStatusUtil = () => isOnline;

const ReactNativeChatComponent = (props) => {

  /** 
   * Network event listener native to device
   * Will update `isOnline` value asynchronously whenever network calls are made
  */
  const unsubscribeNetworkEventListener = NetInfo.addEventListener(state => {
    isOnline = state.isConnected;
  });

  useEffect(() => {
    return unsubscribeNetworkEventListener();
  }, []);

  const initializeChatJS = () => {
    // To configure WebSocketManager, setGlobalConfig must be invoked
    connect.ChatSession.setGlobalConfig({
      // ...
      webSocketManagerConfig: {
        isNetworkOnline: customNetworkStatusUtil,
      }
    });
  }

  // ...
}
```

4. Optionally, this configuration can be dynamically set based on the `Platform`

```js
import { Platform } from 'react-native';

const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';

const customNetworkStatusUtil = () => {
  if (navigator && navigator.hasOwnProperty("onLine")) {
    return navigator.onLine;
  }

  return true;
}

connect.ChatSession.setGlobalConfig({
  // ...
  webSocketManagerConfig: {
    ...(isMobile ? { isNetworkOnline: customNetworkStatusUtil } : {}), // use default behavior for browsers
  }
});
```
-->