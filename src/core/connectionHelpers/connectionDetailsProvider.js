import { IllegalArgumentException } from "../exceptions";
import { ConnectionInfoType } from "./baseConnectionHelper";
import { ACPS_METHODS, CSM_CATEGORY, SESSION_TYPES, TRANSPORT_LIFETIME_IN_SECONDS, FEATURES, CONN_ACK_FAILED } from "../../constants";
import { csmService } from "../../service/csmService";
import { GlobalConfig } from "../../globalConfig";

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

    _handleCreateParticipantConnectionResponse(connectionDetails, ConnectParticipant) {
        this.connectionDetails = {
            url: connectionDetails.Websocket.Url,
            expiry: connectionDetails.Websocket.ConnectionExpiry,
            transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS,
            connectionAcknowledged: ConnectParticipant,
        };
        this.connectionToken = connectionDetails.ConnectionCredentials.ConnectionToken;
        this.connectionTokenExpiry = connectionDetails.ConnectionCredentials.Expiry;
        return connectionDetails;
    }

    _handleGetConnectionTokenResponse(connectionTokenDetails) {
        this.connectionDetails = {
            url: null,
            expiry: null
        };
        this.connectionToken = connectionTokenDetails.participantToken;
        this.connectionTokenExpiry = connectionTokenDetails.expiry;
        return Promise.resolve(connectionTokenDetails);
    }

    callCreateParticipantConnection({ Type = true, ConnectParticipant = false } = {}){
        const startTime = new Date().getTime();
        return this.chatClient
            .createParticipantConnection(this.participantToken, Type ? [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] : null, ConnectParticipant ? ConnectParticipant : null)
            .then((response) => {
                if (Type) {
                    this._addParticipantConnectionMetric(startTime);
                    return this._handleCreateParticipantConnectionResponse(response.data, ConnectParticipant);
                }
            })
            .catch( error => {
                if (Type) {
                    this._addParticipantConnectionMetric(startTime, true);
                }
                return Promise.reject({
                    reason: "Failed to fetch connectionDetails with createParticipantConnection",
                    _debug: error
                });
            });
    }

    _addParticipantConnectionMetric(startTime, error = false) {
        csmService.addLatencyMetric(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, startTime, CSM_CATEGORY.API);
        csmService.addCountAndErrorMetric(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, CSM_CATEGORY.API, error);
    }

    async _fetchConnectionDetails() {
        // If this is a customer session, use the provided participantToken to call createParticipantConnection for our connection details. 
        if (this.sessionType === SESSION_TYPES.CUSTOMER) {
            return this.callCreateParticipantConnection();
        }
        // If this is an agent session, we can't assume that the participantToken is valid. 
        // In this case, we use the getConnectionToken API to fetch a valid connectionToken and expiry. 
        // If that fails, for now we try with createParticipantConnection.
        else if (this.sessionType === SESSION_TYPES.AGENT){
            return this.getConnectionToken()
                .then((response) => {
                    return this._handleGetConnectionTokenResponse(response.chatTokenTransport);
                })
                .catch(() => {
                    if (!GlobalConfig.isFeatureEnabled(FEATURES.PARTICIPANT_CONN_ACK)) {
                        //current behaviour
                        return this.callCreateParticipantConnection();
                    }
                    //new behaviour for connAck
                    return this.callCreateParticipantConnection({
                        Type: true,
                        ConnectParticipant: true
                    }).catch((err) => {
                        throw new Error({
                            type: CONN_ACK_FAILED,
                            errorMessage: err
                        });
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