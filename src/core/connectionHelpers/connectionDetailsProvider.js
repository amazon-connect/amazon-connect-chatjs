import { IllegalArgumentException } from "../exceptions";
import { LogManager } from "../../log";
import { ConnectionInfoType } from "./baseConnectionHelper";
import {
    ACPS_METHODS,
    CSM_CATEGORY,
    SESSION_TYPES,
    TRANSPORT_LIFETIME_IN_SECONDS,
    CONN_ACK_FAILED,
    AGENT_GET_CONNECTION_TOKEN_ERROR_RATE,
    AGENT_CREATE_PARTICIPANT_ERROR_RATE
} from "../../constants";
import { csmService } from "../../service/csmService";

export default class ConnectionDetailsProvider {

    constructor(participantToken, chatClient, sessionType, getConnectionToken=null, usingCustomChatClient=false, logMetaData=null) {
        this.chatClient = chatClient;
        this.participantToken = participantToken || null;
        this.connectionDetails = null;
        this.connectionToken = null;
        this.connectionTokenExpiry = null;
        this.sessionType = sessionType;
        this.getConnectionToken = getConnectionToken;
        this.usingCustomChatClient = usingCustomChatClient;
        // Set only when a response omits ConnectionCredentials. A customChatClient that returns them stays false.
        this.tokenless = false;
        this.logger = LogManager.getLogger({ prefix: "ChatJS-ConnectionDetailsProvider", logMetaData });
    }

    /** Only a customChatClient may omit ConnectionCredentials; for the bundled AWS client that is a malformed response. */
    _allowsTokenlessConnection() {
        return this.usingCustomChatClient === true;
    }

    /** True once a response has actually come back without credentials, so there is no token to refresh. */
    isTokenless() {
        return this.tokenless === true;
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
        return this._fetchConnectionDetails().then((connectionDetails) => connectionDetails);
    }

    _handleCreateParticipantConnectionResponse(connectionDetails, ConnectParticipant) {
        // Only a customChatClient can go tokenless. The bundled AWS client still requires ConnectionCredentials.
        const entersTokenless = !this.tokenless && this._allowsTokenlessConnection() && !connectionDetails.ConnectionCredentials;
        if ((this.tokenless || entersTokenless) && !connectionDetails.Websocket?.Url) {
            throw new IllegalArgumentException(
                "CreateParticipantConnection response is missing Websocket.Url."
            );
        }
        if (entersTokenless) {
            this.logger.warn(
                "CreateParticipantConnection returned no ConnectionCredentials; running tokenless for the rest of " +
                "this session. connectionToken will be null on every subsequent call to your customChatClient."
            );
            this.tokenless = true;
        }
        // A tokenless session stays tokenless. The backend owns the token and its refresh, not ChatJS.
        const credentials = this.tokenless
            ? { ConnectionToken: null, Expiry: null }
            : connectionDetails.ConnectionCredentials;
        this.connectionDetails = {
            url: connectionDetails.Websocket.Url,
            expiry: connectionDetails.Websocket.ConnectionExpiry,
            transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS,
            connectionAcknowledged: ConnectParticipant,
            connectionToken: credentials.ConnectionToken,
            connectionTokenExpiry: credentials.Expiry,
        };
        this.connectionToken = credentials.ConnectionToken;
        this.connectionTokenExpiry = credentials.Expiry;
        return this.connectionDetails;
    }

    _handleGetConnectionTokenResponse(connectionTokenDetails) {
        this.connectionDetails = {
            url: null,
            expiry: null,
            connectionToken: connectionTokenDetails.participantToken,
            connectionTokenExpiry: connectionTokenDetails.expiry,
            transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS,
            connectionAcknowledged: false,
        };
        this.connectionToken = connectionTokenDetails.participantToken;
        this.connectionTokenExpiry = connectionTokenDetails.expiry;
        return Promise.resolve(this.connectionDetails);
    }

    _isAgentSession() {
        return this.sessionType === SESSION_TYPES.AGENT;
    }

    callCreateParticipantConnection({ Type = true, ConnectParticipant = false } = {}){
        const startTime = new Date().getTime();
        return this.chatClient
            .createParticipantConnection(this.participantToken, Type ? [ConnectionInfoType.WEBSOCKET, ConnectionInfoType.CONNECTION_CREDENTIALS] : null, ConnectParticipant ? ConnectParticipant : null)
            .then((response) => {
                if (this._isAgentSession()) {
                    csmService.addAgentCountMetric(
                        AGENT_CREATE_PARTICIPANT_ERROR_RATE,
                        0
                    );
                }
                if (Type) {
                    this._addParticipantConnectionMetric(startTime);
                    return this._handleCreateParticipantConnectionResponse(response.data, ConnectParticipant);
                }
            })
            .catch( error => {
                if (this._isAgentSession() && !error?.statusCode?.toString().startsWith("4")) {
                    csmService.addAgentCountMetric(
                        AGENT_CREATE_PARTICIPANT_ERROR_RATE,
                        1
                    );
                }
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
        csmService.addLatencyMetricWithStartTime(ACPS_METHODS.CREATE_PARTICIPANT_CONNECTION, startTime, CSM_CATEGORY.API);
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
                    if (this._isAgentSession()) {
                        csmService.addAgentCountMetric(
                            AGENT_GET_CONNECTION_TOKEN_ERROR_RATE,
                            0
                        );
                    }
                    return this._handleGetConnectionTokenResponse(response.chatTokenTransport);
                })
                .catch(() => {
                    if (this._isAgentSession()) {
                        csmService.addAgentCountMetric(
                            AGENT_GET_CONNECTION_TOKEN_ERROR_RATE,
                            1
                        );
                    }
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
