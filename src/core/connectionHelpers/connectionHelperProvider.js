import { ConnectionType } from "./baseConnectionHelper";
import ConnectionDetailsProvider from "./connectionDetailsProvider";

import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";

class ConnectionHelperProvider {

  get(contactId, participantId, initialContactId, connectionDetails, participantToken, chatClient, websocketManager, createConnectionToken, reconnectConfig) {
    const connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient, createConnectionToken, contactId, participantId);
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
