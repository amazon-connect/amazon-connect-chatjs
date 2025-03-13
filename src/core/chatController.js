import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";
import {
    DUMMY_ENDED_EVENT,
    CHAT_EVENTS,
    TRANSCRIPT_DEFAULT_PARAMS,
    SESSION_TYPES,
    CONTENT_TYPE,
    CHAT_EVENT_TYPE_MAPPING,
    CSM_CATEGORY,
    ACPS_METHODS,
    FEATURES,
    CREATE_PARTICIPANT_CONACK_FAILURE,
    CREATE_PARTICIPANT_CONACK_API_CALL_COUNT
} from "../constants";
import { LogManager } from "../log";
import { EventBus } from "./eventbus";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import ConnectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import MessageReceiptsUtil from './MessageReceiptsUtil';
import { csmService } from "../service/csmService";
import { GlobalConfig } from "../globalConfig";

var NetworkLinkStatus = {
    NeverEstablished: "NeverEstablished",
    Establishing: "Establishing",
    Established: "Established",
    Broken: "Broken"
};

class ChatController {

    constructor(args) {
        this.argsValidator = new ChatServiceArgsValidator();
        this.pubsub = new EventBus();
        this.sessionType = args.sessionType;
        this.getConnectionToken = args.chatDetails.getConnectionToken;
        this.connectionDetails = args.chatDetails.connectionDetails;
        this.initialContactId = args.chatDetails.initialContactId;
        this.contactId = args.chatDetails.contactId;
        this.participantId = args.chatDetails.participantId;
        this.chatClient = args.chatClient;
        this.participantToken = args.chatDetails.participantToken;
        this.websocketManager = args.websocketManager;
        this._participantDisconnected = false;
        this.sessionMetadata = {};
        this.connectionDetailsProvider = null;
        this.logger = LogManager.getLogger({
            prefix: "ChatJS-ChatController",
            logMetaData: args.logMetaData
        });
        this.logMetaData = args.logMetaData;
        this.messageReceiptUtil = new MessageReceiptsUtil(args.logMetaData);
        this.hasChatEnded = false;
        this.logger.info("Browser info:", window.navigator.userAgent);
    }

    subscribe(eventName, callback) {
        this.pubsub.subscribe(eventName, callback);
        this._sendInternalLogToServer(this.logger.info("Subscribed successfully to event:", eventName));
    }

    handleRequestSuccess(metadata, method, startTime, contentType) {
        return response => {
            const contentTypeDimension = contentType?
                [
                    {
                        name: "ContentType",
                        value: contentType
                    }
                ]
                : [];
            csmService.addLatencyMetricWithStartTime(method, startTime, CSM_CATEGORY.API, contentTypeDimension);
            csmService.addCountAndErrorMetric(method, CSM_CATEGORY.API, false, contentTypeDimension);
            response.metadata = metadata;
            return response;
        };
    }

    handleRequestFailure(metadata, method, startTime, contentType) {
        return error => {
            const contentTypeDimension = contentType?
                [
                    {
                        name: "ContentType",
                        value: contentType
                    }
                ]
                : [];
            csmService.addLatencyMetricWithStartTime(method, startTime, CSM_CATEGORY.API, contentTypeDimension);
            csmService.addCountAndErrorMetric(method, CSM_CATEGORY.API, true, contentTypeDimension);
            error.metadata = metadata;
            return Promise.reject(error);
        };
    }

    sendMessage(args) {
        if (!this._validateConnectionStatus('sendMessage')) {
            return Promise.reject(`Failed to call sendMessage, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        this.argsValidator.validateSendMessage(args);
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .sendMessage(connectionToken, args.message, args.contentType)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType));
    }

    sendAttachment(args){
        if (!this._validateConnectionStatus('sendAttachment')) {
            return Promise.reject(`Failed to call sendAttachment, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        //TODO: validation
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .sendAttachment(connectionToken, args.attachment, args.metadata)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_ATTACHMENT, startTime, args.attachment.type))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_ATTACHMENT, startTime, args.attachment.type));
    }

    downloadAttachment(args){
        if (!this._validateConnectionStatus('downloadAttachment')) {
            return Promise.reject(`Failed to call downloadAttachment, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .downloadAttachment(connectionToken, args.attachmentId)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.DOWNLOAD_ATTACHMENT, startTime))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.DOWNLOAD_ATTACHMENT, startTime));
    }

    sendEventIfChatHasNotEnded(...args) {
        if (this.hasChatEnded) {
            this.logger.warn("Ignoring sendEvent API bec chat has ended", ...args);
            return Promise.resolve();
        }
        return this.chatClient.sendEvent(...args);
    }

    sendEvent(args) {
        if (!this._validateConnectionStatus('sendEvent')) {
            return Promise.reject(`Failed to call sendEvent, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        this.argsValidator.validateSendEvent(args);
        const connectionToken = this.connectionHelper.getConnectionToken();
        const content = args.content || null;
        var eventType = getEventTypeFromContentType(args.contentType);
        var parsedContent = typeof content === "string" ? JSON.parse(content) : content;
        if (this.messageReceiptUtil.isMessageReceipt(eventType, args)) {
            // Ignore all MessageReceipt events
            if(!GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED) || !parsedContent.messageId) {
                this.logger.warn(`Ignoring messageReceipt: ${GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED) && "missing messageId"}`, args);
                return Promise.reject({
                    errorMessage: `Ignoring messageReceipt: ${GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED) && "missing messageId"}`,
                    data: args
                });
            }
            // Prioritize and send selective message receipts
            return this.messageReceiptUtil.prioritizeAndSendMessageReceipt(this.chatClient, this.sendEventIfChatHasNotEnded.bind(this),
                connectionToken,
                args.contentType,
                content, 
                eventType, 
                GlobalConfig.getMessageReceiptsThrottleTime())
                .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType))
                .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType));
        }
        return this.chatClient
            .sendEvent(
                connectionToken,
                args.contentType,
                content
            )
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType));
    }

    getTranscript(inputArgs = {}) {
        if (!this._validateConnectionStatus('getTranscript')) {
            return Promise.reject(`Failed to call getTranscript, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = inputArgs.metadata || null;
        const args = {
            startPosition: inputArgs.startPosition || {},
            scanDirection: inputArgs.scanDirection || TRANSCRIPT_DEFAULT_PARAMS.SCAN_DIRECTION,
            sortOrder: inputArgs.sortOrder || TRANSCRIPT_DEFAULT_PARAMS.SORT_ORDER,
            maxResults: inputArgs.maxResults || TRANSCRIPT_DEFAULT_PARAMS.MAX_RESULTS,
        };
        if (inputArgs.nextToken) {
            args.nextToken = inputArgs.nextToken;
        }
        if (inputArgs.contactId) {
            args.contactId = inputArgs.contactId;
        }
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .getTranscript(connectionToken, args)
            .then(
                this.messageReceiptUtil.rehydrateReceiptMappers(
                    this.handleRequestSuccess(metadata, ACPS_METHODS.GET_TRANSCRIPT, startTime), 
                    GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)
                )
            )
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.GET_TRANSCRIPT, startTime));
    }

    connect(args={}) {
        this.sessionMetadata = args.metadata || null;
        this.argsValidator.validateConnectChat(args);
        if (!this.connectionDetailsProvider) {
            this.connectionDetailsProvider = this._getConnectionDetailsProvider();
            return this.connectionDetailsProvider.fetchConnectionDetails()
                .then(
                    (connectionDetails) =>
                        this._initConnectionHelper(this.connectionDetailsProvider, connectionDetails)
                )
                .then((response) => this._onConnectSuccess(response, this.connectionDetailsProvider))
                .catch(err => {
                    return this._onConnectFailure(err);
                });
        } else {
            this.logger.warn("Ignoring duplicate call to connect. Method can only be invoked once", args);
        }
    }

    _initConnectionHelper(connectionDetailsProvider, connectionDetails) {
        this.connectionHelper = new LpcConnectionHelper(
            this.contactId,
            this.initialContactId,
            connectionDetailsProvider,
            this.websocketManager,
            this.logMetaData,
            connectionDetails
        );
        this.connectionDetails = connectionDetails;
        this.connectionHelper.onEnded(this._handleEndedConnection.bind(this));
        this.connectionHelper.onConnectionLost(this._handleLostConnection.bind(this));
        this.connectionHelper.onConnectionGain(this._handleGainedConnection.bind(this));
        this.connectionHelper.onMessage(this._handleIncomingMessage.bind(this));
        this.connectionHelper.onDeepHeartbeatSuccess(this._handleDeepHeartbeatSuccess.bind(this));
        this.connectionHelper.onDeepHeartbeatFailure(this._handleDeepHeartbeatFailure.bind(this));
        this.connectionHelper.onBackgroundChatEnded(this._handleBackgroundChatEnded.bind(this));
        return this.connectionHelper.start();
    }

    _getConnectionDetailsProvider() {
        return new ConnectionDetailsProvider(
            this.participantToken, 
            this.chatClient,
            this.sessionType,
            this.getConnectionToken
        );
    }

    _handleEndedConnection(eventData) {
        this._forwardChatEvent(CHAT_EVENTS.CONNECTION_BROKEN, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
        this.breakConnection();
    }

    _handleLostConnection(eventData) {
        this._forwardChatEvent(CHAT_EVENTS.CONNECTION_LOST, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
    }

    _handleGainedConnection(eventData) {
        this.hasChatEnded = false;

        this._forwardChatEvent(CHAT_EVENTS.CONNECTION_ESTABLISHED, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
    }

    _handleDeepHeartbeatSuccess(eventData) {
        this._forwardChatEvent(CHAT_EVENTS.DEEP_HEARTBEAT_SUCCESS, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
    }

    _handleDeepHeartbeatFailure(eventData) {
        this._forwardChatEvent(CHAT_EVENTS.DEEP_HEARTBEAT_FAILURE, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
    }

    _handleBackgroundChatEnded() {
        // Simulate end event when chat has ended while WebSocket connection was broken
        this._handleIncomingMessage(DUMMY_ENDED_EVENT);
    }

    _handleIncomingMessage(incomingData) {
        try {
            let eventType = getEventTypeFromContentType(incomingData?.ContentType);
            if (this.messageReceiptUtil.isMessageReceipt(eventType, incomingData)) {
                eventType = this.messageReceiptUtil.getEventTypeFromMessageMetaData(incomingData?.MessageMetadata);
                if (!eventType || 
            !this.messageReceiptUtil.shouldShowMessageReceiptForCurrentParticipantId(this.participantId, incomingData)) {
                    //ignore bec we do not want to show messageReceipt to sender of receipt.
                    //messageReceipt needs to be shown to the sender of message.
                    return;
                }
            }

            this._forwardChatEvent(eventType, {
                data: incomingData,
                chatDetails: this.getChatDetails()
            });
            if (incomingData.ContentType === CONTENT_TYPE.chatEnded) {
                this.hasChatEnded = true;
                this._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, {
                    data: null,
                    chatDetails: this.getChatDetails()
                });
                this.breakConnection();
            }
            if (incomingData.ContentType === CONTENT_TYPE.transferSucceeded && this.sessionType !== SESSION_TYPES.CUSTOMER) {
                // calls LpcConnectionHelper to remove message subscriptions for agent and supervisor sessions in Agent transfer use case
                // Customer SIM: https://t.corp.amazon.com/P149853425/communication
                this.breakConnection();
            }
        } catch (e) {
            this._sendInternalLogToServer(this.logger.error(
                "Error occured while handling message from Connection. eventData:",
                incomingData,
                " Causing exception:",
                e
            ));
        }
    }

    _forwardChatEvent(eventName, eventData) {
        this.pubsub.triggerAsync(eventName, eventData);
    }

    _onConnectSuccess(response, connectionDetailsProvider) {
        this._sendInternalLogToServer(this.logger.info("Connect successful!"));
        this.logger.warn("onConnectionSuccess response", response);

        const responseObject = {
            _debug: response,
            connectSuccess: true,
            connectCalled: true,
            metadata: this.sessionMetadata
        };
        const eventData = Object.assign({
            chatDetails: this.getChatDetails()
        }, responseObject);
        this.pubsub.triggerAsync(CHAT_EVENTS.CONNECTION_ESTABLISHED, eventData);
        
        // TODO: Fix the floating promise issue: https://app.asana.com/0/1203611591691532/1203880194668408/f
        const connectionAcknowledged = connectionDetailsProvider.getConnectionDetails()?.connectionAcknowledged;
        if (this._shouldAcknowledgeContact() && !connectionAcknowledged) {
            csmService.addAgentCountMetric(CREATE_PARTICIPANT_CONACK_API_CALL_COUNT, 1);
            connectionDetailsProvider.callCreateParticipantConnection({
                Type: false,
                ConnectParticipant: true
            }).catch(err => {
                this.logger.warn("ConnectParticipant failed to acknowledge Agent connection in CreateParticipantConnection: ", err);
                csmService.addAgentCountMetric(CREATE_PARTICIPANT_CONACK_FAILURE, 1);
            });
        }
        this.logger.warn("onConnectionSuccess responseObject", responseObject);
        return responseObject;
    }

    _onConnectFailure(error) {
        const errorObject = {
            _debug: error,
            connectSuccess: false,
            connectCalled: true,
            metadata: this.sessionMetadata
        };
        this._sendInternalLogToServer(this.logger.error("Connect Failed. Error: ", errorObject));

        return Promise.reject(errorObject);
    }

    _shouldAcknowledgeContact() {
        return this.sessionType === SESSION_TYPES.AGENT;
    }

    breakConnection() {
        return this.connectionHelper
            ? this.connectionHelper.end()
            : Promise.resolve();
    }

    // Do any clean up that needs to be done upon the participant being disconnected from the chat -
    // disconnected here means that the participant is no longer part of ther chat.
    cleanUpOnParticipantDisconnect() {
        this.pubsub.unsubscribeAll();
    }

    disconnectParticipant() {
        if (!this._validateConnectionStatus('disconnectParticipant')) {
            return Promise.reject(`Failed to call disconnectParticipant, No active connection`);
        }
        const startTime = new Date().getTime();
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .disconnectParticipant(connectionToken)
            .then(response => {
                this._sendInternalLogToServer(this.logger.info("Disconnect participant successfully"));

                this._participantDisconnected = true;
                this.cleanUpOnParticipantDisconnect();
                this.breakConnection();
                csmService.addLatencyMetricWithStartTime(ACPS_METHODS.DISCONNECT_PARTICIPANT, startTime, CSM_CATEGORY.API);
                csmService.addCountAndErrorMetric(ACPS_METHODS.DISCONNECT_PARTICIPANT, CSM_CATEGORY.API, false);
                response = {...(response || {})};
                return response;
            }, error => {
                this._sendInternalLogToServer(this.logger.error("Disconnect participant failed. Error:", error));
                csmService.addLatencyMetricWithStartTime(ACPS_METHODS.DISCONNECT_PARTICIPANT, startTime, CSM_CATEGORY.API);
                csmService.addCountAndErrorMetric(ACPS_METHODS.DISCONNECT_PARTICIPANT, CSM_CATEGORY.API, true);
                return Promise.reject(error);
            });
    }

    getChatDetails() {
        return {
            initialContactId: this.initialContactId,
            contactId: this.contactId,
            participantId: this.participantId,
            participantToken: this.participantToken,
            connectionDetails: this.connectionDetails
        };
    }

    describeView(args) {
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .describeView(args.viewToken, connectionToken)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.DESCRIBE_VIEW, startTime))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.DESCRIBE_VIEW, startTime));
    }

    getAuthenticationUrl(args) {
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .getAuthenticationUrl(connectionToken, args.redirectUri, args.sessionId)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.GET_AUTHENTICATION_URL, startTime))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.GET_AUTHENTICATION_URL, startTime));
    }

    cancelParticipantAuthentication(args) {
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .cancelParticipantAuthentication(connectionToken, args.sessionId)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.CANCEL_AUTHENTICATION, startTime))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.CANCEL_AUTHENTICATION, startTime));
    }


    _convertConnectionHelperStatus(connectionHelperStatus) {
        switch (connectionHelperStatus) {
        case ConnectionHelperStatus.NeverStarted:
            return NetworkLinkStatus.NeverEstablished;
        case ConnectionHelperStatus.Starting:
            return NetworkLinkStatus.Establishing;
        case ConnectionHelperStatus.Ended:
            return NetworkLinkStatus.Broken;
        case ConnectionHelperStatus.ConnectionLost:
            return NetworkLinkStatus.Broken;
        case ConnectionHelperStatus.Connected:
            return NetworkLinkStatus.Established;
        case ConnectionHelperStatus.DeepHeartbeatSuccess:
            return NetworkLinkStatus.Established;
        case ConnectionHelperStatus.DeepHeartbeatFailure:
            return NetworkLinkStatus.Broken;
        }
        this._sendInternalLogToServer(this.logger.error(
            "Reached invalid state. Unknown connectionHelperStatus: ",
            connectionHelperStatus
        ));
    }
 
    getConnectionStatus() {
        return this._convertConnectionHelperStatus(
            this.connectionHelper.getStatus()
        );
    }

    _sendInternalLogToServer(logEntry) {
        if (logEntry && typeof logEntry.sendInternalLogToServer === "function")
            logEntry.sendInternalLogToServer();

        return logEntry;
    }

    _validateConnectionStatus(functionName) {
        if (!this.connectionHelper) {
            this.logger.error(`Cannot call ${functionName} before calling connect()`);
            return false;
        }
        if (this._participantDisconnected) {
            this.logger.error(`Cannot call ${functionName} when participant is disconnected`);
            return false;
        }
        return true;
    }
}

export const getEventTypeFromContentType = (contentType) => {
    return CHAT_EVENT_TYPE_MAPPING[contentType] || CHAT_EVENT_TYPE_MAPPING.default;
};

export { ChatController, NetworkLinkStatus };
