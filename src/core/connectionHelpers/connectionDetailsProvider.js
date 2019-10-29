import { IllegalArgumentException } from "../exceptions";
import { ConnectionType, ConnectionInfoType } from "./baseConnectionHelper";

export default class ConnectionDetailsProvider {

  constructor(connectionDetails, participantToken, chatClient, createConnectionToken) {
    this.chatClient = chatClient;
    this.participantToken = participantToken || null;
    this.connectionDetails = connectionDetails || null;
    this.connectionToken = null;
    this.connectionType = null;
    this.firstCall = true;
    this.createConnectionToken = createConnectionToken || null;
  }

  init() {
    if (!this.participantToken && this.connectionDetails) {
      return Promise.resolve().then(() => {
        this._handlePresetConnectionDetails();
        return this.connectionDetails;
      });
    } else {
      return this._fetchConnectionDetails().then(() => this.connectionDetails);
    }
  }

  fetchConnectionDetails() {
    // To not waste the first request we have to make in order to determine IOT vs. LPC
    // we return the already fetched connectionDetails if this is the first call.
    if (this.firstCall) {
      this.firstCall = false;
      return Promise.resolve(this.connectionDetails);
    } else if (!this.participantToken && this.connectionType === ConnectionType.IOT) {
        return Promise.reject("Fatal: Cannot use static connection details more than once.");
    } else {
      return this._fetchConnectionDetails().then(() => this.connectionDetails);
    }
  }

  fetchConnectionToken() {
    // To not waste the first request we have to make in order to determine IOT vs. LPC
    // we return the already fetched connectionToken if this is the first call
    if (this.firstCall) {
      this.firstCall = false;
      return Promise.resolve(this.connectionToken);
    } else if (!this.participantToken && this.connectionType === ConnectionType.IOT) {
      return Promise.reject("Fatal: Cannot use static connection details more than once.");
    } else {
      return this._fetchConnectionDetails().then(() => this.connectionToken);
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

  _handleTokenResponse(connectionToken) {
    this.connectionToken = connectionToken;
    this.connectionType = ConnectionType.LPC;
    this.connectionDetails = {
      connectionId: null,
      preSignedConnectionUrl: null
    };
  }

  _fetchConnectionDetails() {
    // If we are using LPC, ping the new API. Otherwise, need to use the old API to retrieve connectionId.
    if (this.participantToken) {
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
    } else if (this.createConnectionToken) {
      return this.createConnectionToken()
        .then(response => this._handleTokenResponse(response.chatTokenTransport.participantToken))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionToken via createConnectionToken api",
            _debug: error
          });
        });
    }
    else {
      return Promise.reject({
        reason: "Failed to fetch connectionDetails: a valid createConnectionToken was not supplied.",
        _debug: new IllegalArgumentException("createConnectionToken was invalid")
      });
    }
  }
}