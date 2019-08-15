import { ConnectionType } from "./baseConnectionHelper";
import ConnectionDetailsProvider from "./connectionDetailsProvider";

import IotConnectionHelper from "./IotConnectionHelper";
import LpcConnectionHelper from "./LpcConnectionHelper";

class ConnectionHelperProvider {

  constructor() {
    this.connectionHelper = null;
    this.connectionDetailsProvider = null;
  }

  get(contactId, connectionDetails, participantToken, chatClient, websocketManager, reconnectConfig) {
    if (this.connectionHelper) {
      return Promise.resolve(
        new LpcConnectionHelper(contactId, this.connectionHelper.connectionDetailsProvider, websocketManager)
      );
    }
    this.connectionDetailsProvider = new ConnectionDetailsProvider(connectionDetails, participantToken, chatClient);
    return this.connectionDetailsProvider.init().then(() => {
      if (this.connectionDetailsProvider.connectionType === ConnectionType.LPC) {
        this.connectionHelper = new LpcConnectionHelper(contactId, this.connectionDetailsProvider, websocketManager);
        return this.connectionHelper;
      } else if (this.connectionDetailsProvider.connectionType === ConnectionType.IOT) {
        return new IotConnectionHelper(contactId, this.connectionDetailsProvider, reconnectConfig);
      }
    });
  }
}

export default new ConnectionHelperProvider();
