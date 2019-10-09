import { ConnectionType } from "./baseConnectionHelper";
import { IllegalArgumentException } from "../exceptions";

export default class ConnectionDetailsProvider {

  constructor(connectionDetails, participantToken, chatClient, createConnectionToken, contactId, participantId) {
    this.chatClient = chatClient;
    this.participantToken = participantToken || null;
    this.connectionDetails = connectionDetails || null;
    this.connectionToken = null;
    this.connectionType = null;
    this.firstCall = true;
    this.createConnectionToken = createConnectionToken|| null;
    this.contactId = contactId;
    this.participantId = participantId;
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

  _handleDetailsResponse(connectionDetails) {
    if (connectionDetails.PreSignedConnectionUrl){
      this.connectionType = connectionDetails.PreSignedConnectionUrl.includes(".iot.") 
        ? ConnectionType.IOT : ConnectionType.LPC;
    } else {
      this.connectionType = ConnectionType.LPC;
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
    if (this.participantToken) {
      return this.chatClient
        .createConnectionDetails(this.participantToken)
        .then(response => this._handleDetailsResponse(response.data))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionDetails",
            _debug: error
          });
        });
    } else if (this.createConnectionToken && this.participantId && this.contactId) {
      // Note that chatTokenTransport.participantToken is the current naming scheme 
      // for the getConnectionToken "chat_token" API, but it is going to be updated, 
      // so this call will need to be adjusted.
      return this.createConnectionToken({
        participantId: this.participantId, 
        contactId: this.contactId 
      })
        .then(response => this._handleTokenResponse(response.chatTokenTransport.participantToken))
        .catch(error => {
          return Promise.reject({
            reason: "Failed to fetch connectionToken via createConnectionToken api",
            _debug: error
          });
        });
    } else {
      return Promise.reject({
        reason: "Failed to fetch connectionDetails: createConnectionToken or its credentials were not present.",
        _debug: new IllegalArgumentException("createConnectionToken or its credentials were invalid")
      });
    }
  }
}