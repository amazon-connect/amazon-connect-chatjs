import { IllegalArgumentException } from "../exceptions";
import { ConnectionInfoType } from "./baseConnectionHelper";

export default class ConnectionDetailsProvider {

  constructor(participantToken, chatClient) {
    this.chatClient = chatClient;
    this.participantToken = participantToken || null;
    this.connectionDetails = null;
    this.connectionToken = null;
    this.connectionTokenExpiry = null;
  }

  getConnectionToken() {
    return this.connectionToken;
  }

  getConnectionTokenExpiry() {
    return this.connectionTokenExpiry;
  }

  getConnectionDetails() {
    return this.connectionDetails;
  }

  fetchConnectionDetails() {
    return this._fetchConnectionDetails().then(() => this.connectionDetails);
  }

  fetchConnectionToken() {
    return this._fetchConnectionDetails().then(() => this.connectionToken);
  }

  _handleCreateParticipantConnectionResponse(connectionDetails) {
    this.connectionDetails = {
      url: connectionDetails.Websocket.Url,
      expiry: connectionDetails.Websocket.ConnectionExpiry
    };
    this.connectionToken = connectionDetails.ConnectionCredentials.ConnectionToken;
    this.connectionTokenExpiry = connectionDetails.ConnectionCredentials.Expiry;
  }

  _fetchConnectionDetails() {
    // If we have a participantToken, use it to fetch the authToken and url through the createParticipantConnection Chat API
    if (this.participantToken) {
      return this.chatClient
        .createParticipantConnection(this.participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] )
        .then((response) => this._handleCreateParticipantConnectionResponse(response.data))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionDetails with createParticipantConnection",
            _debug: error
          });
        });
    } else {
      return Promise.reject({
        reason: "Failed to fetch connectionDetails.",
        _debug: new IllegalArgumentException("Failed to fetch connectionDetails.")
      });
    }
  }
}