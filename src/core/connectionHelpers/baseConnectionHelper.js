import { CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS, CONNECTION_TOKEN_EXPIRY_BUFFER_IN_MS } from "../../constants";
import { LogManager } from "../../log";
const ConnectionHelperStatus = {
    NeverStarted: "NeverStarted",
    Starting: "Starting",
    Connected: "Connected",
    ConnectionLost: "ConnectionLost",
    Ended: "Ended",
    DeepHeartbeatSuccess: "DeepHeartbeatSuccess",
    DeepHeartbeatFailure: "DeepHeartbeatFailure"
};

const ConnectionHelperEvents = {
    ConnectionLost: "ConnectionLost", // event data is: {reason: ...}
    ConnectionGained: "ConnectionGained", // event data is: {reason: ...}
    Ended: "Ended", // event data is: {reason: ...}
    IncomingMessage: "IncomingMessage", // event data is: {payloadString: ...}
    DeepHeartbeatSuccess: "DeepHeartbeatSuccess",
    DeepHeartbeatFailure: "DeepHeartbeatFailure",
    BackgroundChatEnded: "BackgroundChatEnded"
};

const ConnectionInfoType = {
    WEBSOCKET: "WEBSOCKET",
    CONNECTION_CREDENTIALS: "CONNECTION_CREDENTIALS"
};

export default class BaseConnectionHelper {
    constructor(connectionDetailsProvider, logMetaData) {
        this.connectionDetailsProvider = connectionDetailsProvider;
        this.isStarted = false;
        this.logger = LogManager.getLogger({ prefix: "ChatJS-BaseConnectionHelper", logMetaData });
    }

    startConnectionTokenPolling(isFirstCall=false, expiry=CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS) {
        if (!isFirstCall){
            //TODO: use Type field to avoid fetching websocket connection
            return this.connectionDetailsProvider.fetchConnectionDetails()
                .then(response => {
                    this.logger.info("Connection token polling succeeded.");
                    expiry = this.getTimeToConnectionTokenExpiry();
                    this.timeout = setTimeout(this.startConnectionTokenPolling.bind(this), expiry);
                    return response;
                })
                .catch((e) => {
                    this.logger.error("An error occurred when attempting to fetch the connection token during Connection Token Polling", e);
                    this.timeout = setTimeout(this.startConnectionTokenPolling.bind(this), expiry);
                    return e;
                });
        }
        else {
            this.logger.info("First time polling connection token.");
            this.timeout = setTimeout(this.startConnectionTokenPolling.bind(this), expiry);
        }
    }

    start() {
        if (this.isStarted) {
            return this.getConnectionToken();
        }
        this.isStarted = true;
        return this.startConnectionTokenPolling(
            true, 
            this.getTimeToConnectionTokenExpiry()
        );
    }

    end() {
        clearTimeout(this.timeout);
    }

    getConnectionToken() {
        return this.connectionDetailsProvider.getFetchedConnectionToken();
    }

    getConnectionTokenExpiry() {
        return this.connectionDetailsProvider.getConnectionTokenExpiry();
    }

    getTimeToConnectionTokenExpiry() {
        var dateExpiry = new Date(
            this.getConnectionTokenExpiry()
        ).getTime();
        var now = new Date().getTime();
        return dateExpiry - now - CONNECTION_TOKEN_EXPIRY_BUFFER_IN_MS;
    }
}

export {
    ConnectionHelperStatus,
    ConnectionHelperEvents,
    ConnectionInfoType
};
