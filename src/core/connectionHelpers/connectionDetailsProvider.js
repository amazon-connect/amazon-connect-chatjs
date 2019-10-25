import { ConnectionType, ConnectionInfoType } from "./baseConnectionHelper";

export default class ConnectionDetailsProvider {

  constructor(connectionDetails, participantToken, chatClient) {
    this.chatClient = chatClient;
    this.participantToken = participantToken || null;
    this.connectionDetails = connectionDetails || null;
    this.connectionToken = null;
    this.connectionType = null;
    this.firstCall = true;
  }

  init() {
    if (this.participantToken) {
      return this._fetchConnectionDetails().then(() => this.connectionDetails);
    } else if (this.connectionDetails) {
      return Promise.resolve().then(() => {
        this._handlePresetConnectionDetails();
        return this.connectionDetails;
      });
    } else {
      return Promise.reject("Fatal: Cannot get connection details.");
    }
  }

  fetchConnectionDetails() {
    // To not waste the first request we have to make in order to determine IOT vs. LPC
    // we return the already fetched connectionDetails if this is the first call
    if (this.firstCall) {
      this.firstCall = false;
      return Promise.resolve(this.connectionDetails);
    } else if (this.participantToken) {
      return this._fetchConnectionDetails().then(() => this.connectionDetails);
    } else {
      return Promise.reject("Fatal: Cannot use static connection details more than once.");
    }
  }

  fetchConnectionToken() {
    // To not waste the first request we have to make in order to determine IOT vs. LPC
    // we return the already fetched connectionDetails if this is the first call
    if (this.firstCall) {
      this.firstCall = false;
      return Promise.resolve(this.connectionToken);
    } else if (this.participantToken) {
      return this._fetchConnectionDetails().then(() => this.connectionToken);
    } else {
      return Promise.reject("Fatal: Cannot use static connection details more than once.");
    }
  }

  _handlePresetConnectionDetails() {
    this.connectionType = ConnectionType.IOT;
    this.connectionToken = this.connectionDetails.connectionToken;
    this.connectionDetails = {
      connectionId: this.connectionDetails.ConnectionId,
      preSignedConnectionUrl: this.connectionDetails.PreSignedConnectionUrl
    };
  }

  _handleCreateParticipantConnectionResponse(connectionDetails) {
    this.connectionType = ConnectionType.LPC;
    this.connectionToken = connectionDetails.ConnectionCredentials.ConnectionToken;
    this.connectionDetails = {
      connectionId: null,
      preSignedConnectionUrl: connectionDetails.Websocket.Url
    };
  }

  _handleCreateConnectionDetailsResponse(connectionDetails) {
    if (connectionDetails.PreSignedConnectionUrl) {
      this.connectionType = connectionDetails.PreSignedConnectionUrl.includes(".iot.") ? ConnectionType.IOT : ConnectionType.LPC;
    } else {
      this.connectionType = connectionDetails.connectionId ? ConnectionType.IOT : ConnectionType.LPC;
    }
    this.connectionToken = connectionDetails.ParticipantCredentials.ConnectionAuthenticationToken;
    this.connectionDetails = {
      connectionId: connectionDetails.ConnectionId,
      preSignedConnectionUrl: connectionDetails.PreSignedConnectionUrl
    };
  }

  _fetchConnectionDetails() {
    //If we are using LPC, ping the new API. Otherwise, need to use the old API to retrieve connectionId.
    return this.chatClient
      .createParticipantConnection(this.participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] )
      .then((response) => {
        if (response.data.Websocket.Url!==null && response.data.Websocket.Url.includes(".iot.")) {
          return this.chatClient
            .createConnectionDetails(this.participantToken)
            .then(response => this._handleCreateConnectionDetailsResponse(response.data))
            .catch(error => {
              return Promise.reject({
                reason: "Failed to fetch connectionDetails with createConnectionDetails",
                _debug: error
              });
            });
        } else {
          return this._handleCreateParticipantConnectionResponse(response.data);
        }
      })
      .catch(error => {
        return Promise.reject({
          reason: "Failed to fetch connectionDetails with createParticipantConnection",
          _debug: error
        });
      });
  }
}
