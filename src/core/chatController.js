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
    CREATE_PARTICIPANT_CONACK_API_CALL_COUNT,
    STREAM_JS,
    CHAT_SESSION_ERROR_TYPES,
    STREAM_METRIC_ERROR_TYPES,
    TRANSCRIPT_ACTIONS,
    MESSAGE_RECEIPT_TYPE
} from "../constants";
import { LogManager } from "../log";
import { EventBus } from "./eventbus";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import ConnectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import MessageReceiptsUtil from './MessageReceiptsUtil';
import { csmService } from "../service/csmService";
import { GlobalConfig } from "../globalConfig";
import StreamMetricUtils from "../streamMetricUtils";
import PartialMessageUtil from "./PartialMessageUtil";
import InternalTranscriptUtils from "./internalTranscriptUtils";
import { ChatSessionResetError, IllegalStateException } from "./exceptions";

var NetworkLinkStatus = {
    NeverEstablished: "NeverEstablished",
    Establishing: "Establishing",
    Established: "Established",
    Broken: "Broken"
};

/** Internal: a connect() that a later suspend or reset made obsolete. */
class ConnectAbortedError extends Error {}

// Closing and resetting finish synchronously, so they have no in-between states.
const SESSION_STATE = {
    NEW: "NEW",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    SUSPENDED: "SUSPENDED",
    ENDED: "ENDED",
    RESET: "RESET"
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
        this.usingCustomChatClient = args.usingCustomChatClient;
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
        this.partialMessageUtil = new PartialMessageUtil();
        this.internalTranscriptUtils = new InternalTranscriptUtils(this.logger);
        this.transcriptUpdateEnabled = false;
        this._state = SESSION_STATE.NEW;
        // Bumped by suspend and reset, so a connect() still in flight gives up.
        this._connectionEpoch = 0;
        this._lastConnectArgs = {};
        this._resumePromise = null;
    }

    subscribe(eventName, callback) {
        this.pubsub.subscribe(eventName, callback);
        if (eventName === CHAT_EVENTS.TRANSCRIPT_UPDATED) {
            this.transcriptUpdateEnabled = true;
        }
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
            // Only add metadata if method is not GetAttachementURL
            if (method !== ACPS_METHODS.GET_ATTACHMENT_URL) {
                response.metadata = metadata;
            }
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
        const tempId = this._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE, args);
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .sendMessage(connectionToken, args.message, args.contentType, args.clientToken)
            .then(response => {
                this._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE_SUCCESS, { tempId, realId: response?.data?.Id });
                return this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType)(response);
            })
            .catch(error => {
                this._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE_FAILURE, { tempId });
                return this.handleRequestFailure(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType)(error);
            });
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

    getAttachmentURL(args){
        if (!this._validateConnectionStatus('getAttachementURL')) {
            return Promise.reject(`Failed to call getAttachmentURL, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .getAttachmentURL(connectionToken, args.attachmentId)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.GET_ATTACHMENT_URL, startTime))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.GET_ATTACHMENT_URL, startTime));
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
                content,
                args.clientToken
            )
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_EVENT, startTime, args.contentType));
    }

    sendMessageReceipt(args) {
        if (!this._validateConnectionStatus('sendMessageReceipt')) {
            return Promise.reject(`Failed to call sendMessageReceipt, No active connection`);
        }
        const startTime = new Date().getTime();
        const metadata = args.metadata || null;
        const eventType = args.event;
        if (!eventType || (eventType !== MESSAGE_RECEIPT_TYPE.DELIVERED && eventType !== MESSAGE_RECEIPT_TYPE.READ)) {
            return Promise.reject({
                errorMessage: "sendMessageReceipt: event must be 'delivered' or 'read'",
                data: args
            });
        }
        const messageId = args.messageId || (args.message && args.message.Id);
        if (!messageId) {
            return Promise.reject({
                errorMessage: "sendMessageReceipt: messageId or message.Id is required",
                data: args
            });
        }
        const contentType = eventType === MESSAGE_RECEIPT_TYPE.DELIVERED
            ? CONTENT_TYPE.deliveredReceipt
            : CONTENT_TYPE.readReceipt;
        const content = JSON.stringify({ messageId: messageId });
        const connectionToken = this.connectionHelper.getConnectionToken();
        return this.chatClient
            .sendEvent(connectionToken, contentType, content, args.clientToken)
            .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_EVENT, startTime, contentType))
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_EVENT, startTime, contentType));
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
                this.partialMessageUtil.rehydratePartialMessageMap()
            )
            .then(response => {
                this._updateTranscript(TRANSCRIPT_ACTIONS.GET_TRANSCRIPT, { response, scanDirection: args.scanDirection });
                return response;
            })
            .then(
                this.messageReceiptUtil.rehydrateReceiptMappers(
                    this.handleRequestSuccess(metadata, ACPS_METHODS.GET_TRANSCRIPT, startTime), 
                    GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)
                )
            )
            .catch(this.handleRequestFailure(metadata, ACPS_METHODS.GET_TRANSCRIPT, startTime));
    }

    connect(args={}) {
        if (this._state === SESSION_STATE.RESET) {
            return Promise.reject(new ChatSessionResetError());
        }
        this.sessionMetadata = args.metadata || null;
        this.argsValidator.validateConnectChat(args);
        if (!this.connectionDetailsProvider) {
            this._lastConnectArgs = args;
            const epoch = this._connectionEpoch;
            const stateBefore = this._state;
            const provider = this._getConnectionDetailsProvider();
            this.connectionDetailsProvider = provider;
            this._state = SESSION_STATE.CONNECTING;
            return provider.fetchConnectionDetails()
                .then((connectionDetails) => {
                    if (epoch !== this._connectionEpoch) {
                        throw new ConnectAbortedError();
                    }
                    return this._initConnectionHelper(provider, connectionDetails);
                })
                .then((response) => {
                    if (epoch !== this._connectionEpoch) {
                        throw new ConnectAbortedError();
                    }
                    this._state = SESSION_STATE.CONNECTED;
                    return this._onConnectSuccess(response, provider);
                })
                .catch(err => {
                    if (this._state === SESSION_STATE.RESET || err instanceof ChatSessionResetError) {
                        return Promise.reject(new ChatSessionResetError());
                    }
                    if (err instanceof ConnectAbortedError || epoch !== this._connectionEpoch) {
                        return this._onConnectAborted();
                    }
                    // Release a failed resume's connection so it can be retried; plain connect() is unchanged.
                    if (stateBefore === SESSION_STATE.SUSPENDED && this.connectionDetailsProvider === provider) {
                        this.connectionHelper?.end();
                        this.connectionDetailsProvider = null;
                        this.connectionHelper = null;
                        this.connectionDetails = null;
                        this._state = stateBefore;
                    } else if (this._state === SESSION_STATE.CONNECTING) {
                        this._state = stateBefore;
                    }
                    if (stateBefore === SESSION_STATE.SUSPENDED && this._isChatEndedError(err)) {
                        // The contact ended while suspended, so end the session the usual way.
                        this._handleBackgroundChatEnded();
                        return this._onConnectFailure(err).catch(error => Promise.reject({ ...error, chatEnded: true }));
                    }
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
        this.connectionHelper.onSuspended?.(this._handlePeerSuspended.bind(this));
        return this.connectionHelper.start();
    }

    _getConnectionDetailsProvider() {
        return new ConnectionDetailsProvider(
            this.participantToken,
            this.chatClient,
            this.sessionType,
            this.getConnectionToken,
            this.usingCustomChatClient,
            this.logMetaData
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
        // Mirrors hasChatEnded: a regained connection (e.g. agent transfer) means the chat continues.
        if (this._state === SESSION_STATE.ENDED) {
            this._state = SESSION_STATE.CONNECTED;
        }

        this._forwardChatEvent(CHAT_EVENTS.CONNECTION_ESTABLISHED, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });

        if (this.transcriptUpdateEnabled) {
            this.getTranscript({ maxResults: 100 }).catch(err => {
                this.logger.warn("Failed to auto-fetch transcript on connection:", err);
            });
        }
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

            if (this.partialMessageUtil.isPartialMessage(incomingData)) {
                const stitchedMessage = this.partialMessageUtil.handleBotPartialMessage(incomingData);
                if (stitchedMessage) {
                    this._forwardChatEvent(eventType, {
                        data: stitchedMessage,
                        chatDetails: this.getChatDetails()
                    });
                    this._updateTranscript(TRANSCRIPT_ACTIONS.INCOMING_MESSAGE, stitchedMessage);
                }
            } else {
                this._forwardChatEvent(eventType, {
                    data: incomingData,
                    chatDetails: this.getChatDetails()
                });
                this._updateTranscript(TRANSCRIPT_ACTIONS.INCOMING_MESSAGE, incomingData);
            }

            if (incomingData.ContentType === CONTENT_TYPE.chatEnded) {
                this.hasChatEnded = true;
                this._state = SESSION_STATE.ENDED;
                this._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, {
                    data: null,
                    chatDetails: this.getChatDetails()
                }, () => {
                    this._participantDisconnected = true;
                    this.cleanUpOnParticipantDisconnect();    
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

    _forwardChatEvent(eventName, eventData, callback) {
        this.pubsub.triggerAsync(eventName, eventData, callback);
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

    /** A connect() overtaken by suspend is abandoned, not counted as a failure. */
    _onConnectAborted() {
        this._sendInternalLogToServer(this.logger.info("connect() abandoned: the session was suspended"));
        return Promise.reject({
            connectSuccess: false,
            connectCalled: true,
            aborted: true,
            reason: "The WebSocket connection was suspended before connect() completed",
            metadata: this.sessionMetadata
        });
    }

    _onConnectFailure(error) {
        const errorObject = {
            _debug: error,
            connectSuccess: false,
            connectCalled: true,
            metadata: this.sessionMetadata
        };
        this._sendInternalLogToServer(this.logger.error("Connect Failed. Error: ", errorObject));

        const metricName = `${STREAM_JS}-${window.connect.version}-${CHAT_SESSION_ERROR_TYPES.CHATJS_CONNECT_SESSION_ERROR}`;
        StreamMetricUtils.publishError(metricName, STREAM_METRIC_ERROR_TYPES.INTERNAL_SERVER_ERROR);

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

    /** Terminal teardown that keeps the contact live; later calls reject with CHAT_SESSION_RESET. */
    reset() {
        if (this._state === SESSION_STATE.RESET) {
            return Promise.resolve();
        }
        const connectionHelper = this.connectionHelper;
        this._state = SESSION_STATE.RESET;
        this._connectionEpoch++;
        this.cleanUpOnParticipantDisconnect();
        this.messageReceiptUtil.reset();
        this.partialMessageUtil.reset();
        this.connectionDetailsProvider?.reset();
        this.internalTranscriptUtils.reset();
        this.connectionDetailsProvider = null;
        this.connectionHelper = null;
        this.connectionDetails = null;
        this.participantToken = null;
        this.getConnectionToken = null;
        this.sessionMetadata = null;
        this.chatClient = null;
        this.transcriptUpdateEnabled = false;
        this._lastConnectArgs = {};
        this._resumePromise = null;

        return new Promise(resolve => resolve(
            connectionHelper?.endAndRefuseReconnect ? connectionHelper.endAndRefuseReconnect() : connectionHelper?.end()
        ))
            .catch(error => this._sendInternalLogToServer(
                this.logger.warn("Failed to close the websocket during reset", error)
            ));
    }

    /** Closes the WebSocket without ending the contact; resolves once the close is initiated. */
    suspendWebSocketConnection() {
        if (this._state === SESSION_STATE.RESET) {
            return Promise.reject(new ChatSessionResetError());
        }
        if (this._state === SESSION_STATE.ENDED) {
            return Promise.reject(
                new IllegalStateException("Cannot suspend the WebSocket after the chat has ended")
            );
        }
        // The contact's socket is shared, so close it for every session on this contact.
        const socketClosed = new Promise(resolve => resolve(this.connectionHelper?.forceClose()))
            .catch(error => this._sendInternalLogToServer(
                this.logger.warn("Failed to close the websocket during suspend", error)
            ));
        this._enterSuspended({ suspendedBy: "this session" });
        return socketClosed;
    }

    _handlePeerSuspended() {
        if (this._state !== SESSION_STATE.RESET) {
            this._enterSuspended({ suspendedBy: "another session on this contact" });
        }
    }

    _enterSuspended(eventData) {
        this._connectionEpoch++;
        // Chunks that arrive while suspended are lost, so a half-received message can't be completed.
        this.partialMessageUtil.reset();
        this.connectionDetailsProvider = null;
        this.connectionHelper = null;
        this.connectionDetails = null;
        this._resumePromise = null;
        if (this._state !== SESSION_STATE.ENDED) {
            this._state = SESSION_STATE.SUSPENDED;
        }
        this._sendInternalLogToServer(this.logger.info("WebSocket connection suspended"));
        // Every session on the contact is told, since only resumeWebSocketConnection() reconnects it.
        this._forwardChatEvent(CHAT_EVENTS.CONNECTION_SUSPENDED, {
            data: eventData,
            chatDetails: this.getChatDetails()
        });
    }

    /** Reconnects a suspended session with the last connect() arguments; concurrent calls share one attempt. */
    resumeWebSocketConnection() {
        if (this._state === SESSION_STATE.RESET) {
            return Promise.reject(new ChatSessionResetError());
        }
        if (this._state === SESSION_STATE.ENDED) {
            return Promise.reject(
                new IllegalStateException("Cannot resume the WebSocket after the chat has ended")
            );
        }
        if (this._resumePromise) {
            return this._resumePromise;
        }
        if (this._state !== SESSION_STATE.SUSPENDED) {
            this.logger.warn("resumeWebSocketConnection() ignored: the WebSocket connection is not suspended");
            return Promise.resolve({ connectCalled: false, connectSuccess: false, reason: "not suspended" });
        }
        this._sendInternalLogToServer(this.logger.info("Resuming WebSocket connection"));
        const attempt = this.connect(this._lastConnectArgs);
        this._resumePromise = attempt;
        const clear = () => {
            if (this._resumePromise === attempt) {
                this._resumePromise = null;
            }
        };
        attempt.then(clear, clear);
        return attempt;
    }

    // A 403 from CreateParticipantConnection means the participant is no longer part of the contact.
    _isChatEndedError(err) {
        const cause = err?._debug || err || {};
        return cause.statusCode === 403 || cause.type === "AccessDeniedException" || cause.name === "AccessDeniedException";
    }

    getSessionState() {
        return this._state;
    }

    isWebSocketSuspended() {
        return this._state === SESSION_STATE.SUSPENDED;
    }

    /** Rejects calls on a reset session; otherwise calls through unchanged. */
    _guardSession(call) {
        if (this._state === SESSION_STATE.RESET) {
            return Promise.reject(new ChatSessionResetError());
        }
        return call();
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

    _updateTranscript(action, data) {
        if (!this.transcriptUpdateEnabled) return null;
        
        try {
            let result = null;
            switch (action) {
            case TRANSCRIPT_ACTIONS.SEND_MESSAGE:
                result = this.internalTranscriptUtils.handleSendMessage(data);
                break;
            case TRANSCRIPT_ACTIONS.SEND_MESSAGE_SUCCESS:
                if (data.tempId && data.realId) {
                    this.internalTranscriptUtils.handleSendMessageSuccess(data.tempId, data.realId);
                }
                break;
            case TRANSCRIPT_ACTIONS.SEND_MESSAGE_FAILURE:
                if (data.tempId) {
                    this.internalTranscriptUtils.handleSendMessageFailure(data.tempId);
                }
                break;
            case TRANSCRIPT_ACTIONS.GET_TRANSCRIPT:
                this.internalTranscriptUtils.handleGetTranscriptResponse(
                    data.response?.data?.Transcript,
                    data.response?.data?.NextToken,
                    data.scanDirection
                );
                break;
            case TRANSCRIPT_ACTIONS.INCOMING_MESSAGE:
                this.internalTranscriptUtils.handleIncomingItem(data);
                break;
            }
            
            this._forwardChatEvent(CHAT_EVENTS.TRANSCRIPT_UPDATED, {
                data: this.internalTranscriptUtils.getTranscriptData(),
                chatDetails: this.getChatDetails()
            });
            
            return result;
        } catch (e) {
            this.logger.warn("Error updating transcript:", e);
            return null;
        }
    }
}

export const getEventTypeFromContentType = (contentType) => {
    return CHAT_EVENT_TYPE_MAPPING[contentType] || CHAT_EVENT_TYPE_MAPPING.default;
};

export { ChatController, NetworkLinkStatus };
