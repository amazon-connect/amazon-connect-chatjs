import { ConnectionType } from "./baseConnectionHelper";
import ConnectionDetailsProvider from "./connectionDetailsProvider";

import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";

class ConnectionHelperProvider {

  constructor() {
    this.connectionDetailsProvider = null;
  }

  get(contactId, initialContactId, connectionDetails, participantToken, chatClient, websocketManager, reconnectConfig) {
    this.connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient);
    return this.connectionDetailsProvider.init().then(() => {
      if (this.connectionDetailsProvider.connectionType === ConnectionType.LPC) {
        return new LpcConnectionHelper(initialContactId, this.connectionDetailsProvider, websocketManager);
      } else if (this.connectionDetailsProvider.connectionType === ConnectionType.IOT) {
        return new IotConnectionHelper(contactId, this.connectionDetailsProvider, reconnectConfig);
      }
    });
  }
}

export default new ConnectionHelperProvider();
