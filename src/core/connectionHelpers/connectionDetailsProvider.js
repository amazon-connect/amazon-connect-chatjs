import { IllegalArgumentException } from "../exceptions";
import { ConnectionInfoType } from "./baseConnectionHelper";
import { SESSION_TYPES } from "../../constants";

export default class ConnectionDetailsProvider {

  constructor(participantToken, chatClient, sessionType, getConnectionToken=null) {
    this.chatClient = chatClient;
    this.participantToken = participantToken || null;
    this.connectionDetails = null;
    this.connectionToken = null;
    this.connectionTokenExpiry = null;
    this.sessionType = sessionType;
    this.getConnectionToken = getConnectionToken;
  }

  getFetchedConnectionToken() {
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

  _handleCreateConnectionTokenResponse(connectionTokenDetails) {
    this.connectionDetails = {
      url: null,
      expiry: null
    };
    this.connectionToken = connectionTokenDetails.participantToken;
    this.connectionTokenExpiry = connectionTokenDetails.expiry;
  }

  _fetchConnectionDetails() {
    // If this is a customer session, use the provided participantToken to call createParticipantConnection for our connection details. 
    if (this.sessionType === SESSION_TYPES.CUSTOMER) {
      return this.chatClient
        .createParticipantConnection(this.participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] )
        .then((response) => this._handleCreateParticipantConnectionResponse(response.data))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionDetails with createParticipantConnection",
            _debug: error
          });
        });
    }
    // If this is an agent session, we can't assume that the participantToken is valid. 
    // In this case, we use the getConnectionToken API to fetch a valid connectionToken and expiry.
    else if (this.sessionType === SESSION_TYPES.AGENT){
      return this.getConnectionToken()
        .then((response) => this._handleCreateConnectionTokenResponse(response.chatTokenTransport))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionToken via getConnectionToken api",
            _debug: error
          });
        });
      }
      else {
      return Promise.reject({
        reason: "Failed to fetch connectionDetails.",
        _debug: new IllegalArgumentException("Failed to fetch connectionDetails.")
      });
    }
  }
}