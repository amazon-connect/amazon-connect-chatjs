import { ConnectionType } from "./baseConnectionHelper";
import ConnectionDetailsProvider from "./connectionDetailsProvider";

import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";

class ConnectionHelperProvider {

  get(contactId, initialContactId, connectionDetails, participantToken, chatClient, websocketManager, reconnectConfig) {
    const connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient);
    return connectionDetailsProvider.init().then(() => {
      if (connectionDetailsProvider.connectionType === ConnectionType.LPC) {
        return new LpcConnectionHelper(initialContactId, connectionDetailsProvider, websocketManager);
      } else if (connectionDetailsProvider.connectionType === ConnectionType.IOT) {
        return new IotConnectionHelper(contactId, connectionDetailsProvider, reconnectConfig);
      }
    });
  }
}

export default new ConnectionHelperProvider();
