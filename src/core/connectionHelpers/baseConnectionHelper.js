import { CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS, CONNECTION_TOKEN_EXPIRY_BUFFER_IN_MS } from "../../constants";

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

const ConnectionInfoType = {
  WEBSOCKET: "WEBSOCKET",
  CONNECTION_CREDENTIALS: "CONNECTION_CREDENTIALS"
};

export default class BaseConnectionHelper {
  constructor(connectionDetailsProvider) {
    this.connectionDetailsProvider = connectionDetailsProvider;
    this.isStarted = false;
  }

  startConnectionTokenPolling(isFirstCall=false, expiry=CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS) {
    if (!isFirstCall){
      this.connectionDetailsProvider.fetchConnectionToken()
        .then(() => {
          const dateExpiry = this.getConnectionTokenExpiry();
          const now = new Date().getTime();
          expiry = dateExpiry - now - CONNECTION_TOKEN_EXPIRY_BUFFER_IN_MS;
        });
    }
    this.timeout = setTimeout(this.startConnectionTokenPolling.bind(this), expiry);
  }

  start() {
    if (this.isStarted) {
      return;
    }
    this.isStarted = true;
    this.startConnectionTokenPolling(
      true, 
      this.getConnectionTokenExpiry()
    );
  }

  end() {
    clearTimeout(this.timeout);
  }

  getConnectionToken() {
    return this.connectionDetailsProvider.getFetchedConnectionToken();
  }
  getConnectionTokenExpiry() {
    return new Date(
      this.connectionDetailsProvider.getConnectionTokenExpiry()
    ).getTime();
  }
}

export {
  ConnectionHelperStatus,
  ConnectionHelperEvents,
  ConnectionInfoType
};
