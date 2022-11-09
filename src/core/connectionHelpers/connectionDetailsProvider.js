import { IllegalArgumentException } from "../exceptions";
import { ConnectionInfoType } from "./baseConnectionHelper";
import { ACPS_METHODS, CSM_CATEGORY, SESSION_TYPES, TRANSPORT_LIFETIME_IN_SECONDS } from "../../constants";
import { csmService } from "../../service/csmService";

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
      expiry: connectionDetails.Websocket.ConnectionExpiry,
      transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS
    };
    this.connectionToken = connectionDetails.ConnectionCredentials.ConnectionToken;
    this.connectionTokenExpiry = connectionDetails.ConnectionCredentials.Expiry;

  }

  _handleGetConnectionTokenResponse(connectionTokenDetails) {
    this.connectionDetails = {
      url: null,
      expiry: null
    };
    this.connectionToken = connectionTokenDetails.participantToken;
    this.connectionTokenExpiry = connectionTokenDetails.expiry;
  }

  _callCreateParticipantConnection(){
    const startTime = new Date().getTime();
    return this.chatClient
        .createParticipantConnection(this.participantToken, [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] )
        .then((response) => {
          this._handleCreateParticipantConnectionResponse(response.data);
          csmService.addLatencyMetricWithStartTime(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, startTime, CSM_CATEGORY.API);
          csmService.addCountAndErrorMetric(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, CSM_CATEGORY.API, false);
        })
        .catch( error => {
          csmService.addLatencyMetricWithStartTime(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, startTime, CSM_CATEGORY.API);
          csmService.addCountAndErrorMetric(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, CSM_CATEGORY.API, true);
          return Promise.reject({
            reason: "Failed to fetch connectionDetails with createParticipantConnection",
            _debug: error
          });
        });
  }

  _fetchConnectionDetails() {
    // If this is a customer session, use the provided participantToken to call createParticipantConnection for our connection details. 
    if (this.sessionType === SESSION_TYPES.CUSTOMER) {
      return this._callCreateParticipantConnection();
    }
    // If this is an agent session, we can't assume that the participantToken is valid. 
    // In this case, we use the getConnectionToken API to fetch a valid connectionToken and expiry. 
    // If that fails, for now we try with createParticipantConnection.
    else if (this.sessionType === SESSION_TYPES.AGENT){
      return this.getConnectionToken()
        .then((response) => this._handleGetConnectionTokenResponse(response.chatTokenTransport))
        .catch(() => {
          return this._callCreateParticipantConnection();
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