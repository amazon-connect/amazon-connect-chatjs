# React Native Support

> Note: a demo application implementing basic ChatJS functionality is available in the ui-examples repository: [connectReactNativeChat](https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/connectReactNativeChat)

Additional configuration is required to support ChatJS in React Native applications. Use `amazon-connect-chatjs@^1.5.0` and apply the changes below:

<!-- Along with changes below, a full demo application can be found in the ui-examples repository: https://github.com/amazon-connect/amazon-connect-chat-ui-examples/tree/master/connectMobileChatWidgetChatJS (or connectMobileChatWidgetWebView) -->

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
