import { CONNECTION_TOKEN_POLLING_INTERVAL } from "../../constants";

const ConnectionHelperStatus = {
  NeverStarted: "NeverStarted",
  Starting: "Starting",
  Connected: "Connected",
  ConnectionLost: "ConnectionLost",
  Ended: "Ended"
};

const ConnectionHelperEvents = {
  ConnectionLost: "ConnectionLost", // event data is: {reason: ...}
  ConnectionGained: "ConnectionGained", // event data is: {reason: ...}
  Ended: "Ended", // event data is: {reason: ...}
  IncomingMessage: "IncomingMessage" // event data is: {payloadString: ...}
};

const ConnectionType = {
  IOT: 'IOT',
  LPC: 'LPC'
};

const ConnectionInfoType = {
  WEBSOCKET: "WEBSOCKET",
  CONNECTION_CREDENTIALS: "CONNECTION_CREDENTIALS"
};

export default class BaseConnectionHelper {
  constructor(connectionDetailsProvider) {
    this.connectionDetailsProvider = connectionDetailsProvider;
    this.isStarted = false;
  }

  startConnectionTokenPolling(isFirstCall, expiry=CONNECTION_TOKEN_POLLING_INTERVAL) {
    if (!isFirstCall){
      this.connectionDetailsProvider.fetchConnectionToken();
      expiry = this.connectionDetailsProvider.getConnectionTokenExpiry();
    }
    this.timeout = setTimeout(this.startConnectionTokenPolling.bind(this, false), expiry);
  }

  start() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.startConnectionTokenPolling(
      true, 
      this.connectionDetailsProvider.getConnectionTokenExpiry()
    );
  }

  end() {
    clearTimeout(this.timeout);
  }

  getConnectionToken() {
    return this.connectionDetailsProvider.getConnectionToken();
  }
}

export {
  ConnectionHelperStatus,
  ConnectionHelperEvents,
  ConnectionType,
  ConnectionInfoType
};
