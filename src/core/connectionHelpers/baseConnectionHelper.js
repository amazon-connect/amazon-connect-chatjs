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

export default class BaseConnectionHelper {
  constructor(connectionDetailsProvider) {
    this.connectionDetailsProvider = connectionDetailsProvider;
  }

  startConnectionTokenPolling() {
    this.interval = setInterval(() => {
      this.connectionDetailsProvider.fetchConnectionToken();
    }, CONNECTION_TOKEN_POLLING_INTERVAL);
  }

  start() {
    this.startConnectionTokenPolling();
  }

  end() {
    clearInterval(this.interval);
  }

  getConnectionToken() {
    return this.connectionDetailsProvider.connectionToken;
  }
}

export {
  ConnectionHelperStatus,
  ConnectionHelperEvents,
  ConnectionType
};
