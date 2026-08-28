import { ChatClientFactory } from "../client/client";
import { CHAT_EVENTS, CHAT_SESSION_ERROR_TYPES, CHAT_SESSION_SUCCESS_TYPES, FEATURES, SESSION_TYPES, STREAM_JS, STREAM_METRIC_ERROR_TYPES } from "../constants";
import { GlobalConfig } from "../globalConfig";
import WebSocketManager from "../lib/amazon-connect-websocket-manager";
import { LogLevel, LogManager, Logger } from "../log";
import { csmService } from "../service/csmService";
import StreamMetricUtils from "../streamMetricUtils";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { ChatController } from "./chatController";
import {
  IllegalArgumentException,
  UnImplementedMethodException
} from "./exceptions";

const logger = LogManager.getLogger({ prefix: "ChatJS-GlobalConfig" });

class ChatSessionFactory {
    /*eslint-disable no-unused-vars*/

    createAgentChatController(chatDetails, participantType) {
        throw new UnImplementedMethodException(
            "createAgentChatController in ChatControllerFactory."
        );
    }

    createCustomerChatController(chatDetails, participantType) {
        throw new UnImplementedMethodException(
            "createCustomerChatController in ChatControllerFactory."
        );
    }
    /*eslint-enable no-unused-vars*/
}

class PersistentConnectionAndChatServiceSessionFactory extends ChatSessionFactory {
    constructor() {
        super();
        this.argsValidator = new ChatServiceArgsValidator();
    }

    createChatSession(sessionType, chatDetails, options, websocketManager) {
        const chatController = this._createChatController(sessionType, chatDetails, options, websocketManager);
        if (sessionType === SESSION_TYPES.AGENT) {
            return new AgentChatSession(chatController);
        } else if (sessionType === SESSION_TYPES.CUSTOMER) {
            return new CustomerChatSession(chatController);
        } else {
            throw new IllegalArgumentException(
                "Unkown value for session type, Allowed values are: " +
          Object.values(SESSION_TYPES),
                sessionType
            );
        }
    }

    _createChatController(sessionType, chatDetailsInput, options, websocketManager) {
        try {
            var chatDetails = this.argsValidator.normalizeChatDetails(chatDetailsInput);
            var logMetaData = {
                contactId: chatDetails.contactId,
                participantId: chatDetails.participantId,
                sessionType,
            };

            var chatClient = ChatClientFactory.getCachedClient(options, logMetaData);

            var args = {
                sessionType: sessionType,
                chatDetails,
                chatClient,
                websocketManager: websocketManager,
                logMetaData,
            };

            StreamMetricUtils.publishEvent(`${STREAM_JS}-${window.connect.version}-${CHAT_SESSION_SUCCESS_TYPES.CHATJS_CONNECT_SESSION_SUCCESS}`);

            return new ChatController(args);
        }
        catch (err){
            const metricName = `${STREAM_JS}-${window.connect.version}-${CHAT_SESSION_ERROR_TYPES.CHATJS_CREATE_SESSION_ERROR}`;
            StreamMetricUtils.publishError(metricName, STREAM_METRIC_ERROR_TYPES.INTERNAL_SERVER_ERROR);
            logger.error("Error while creating chat session", err);
        }
    }
}

export class ChatSession {
    constructor(controller) {
        this.controller = controller;
    }

    onMessage(callback) {
        this.controller.subscribe(CHAT_EVENTS.INCOMING_MESSAGE, callback);
    }

    onTyping(callback) {
        this.controller.subscribe(CHAT_EVENTS.INCOMING_TYPING, callback);
    }

    onReadReceipt(callback) {
        this.controller.subscribe(CHAT_EVENTS.INCOMING_READ_RECEIPT, callback);
    }

    onDeliveredReceipt(callback) {
        this.controller.subscribe(CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, callback);
    }

    onConnectionBroken(callback) {
        this.controller.subscribe(CHAT_EVENTS.CONNECTION_BROKEN, callback);
    }

    onConnectionEstablished(callback) {
        this.controller.subscribe(CHAT_EVENTS.CONNECTION_ESTABLISHED, callback);
    }

    onEnded(callback) {
        this.controller.subscribe(CHAT_EVENTS.CHAT_ENDED, callback);
    }

    onParticipantIdle(callback) {
        this.controller.subscribe(CHAT_EVENTS.PARTICIPANT_IDLE, callback);
    }

    onParticipantReturned(callback) {
        this.controller.subscribe(CHAT_EVENTS.PARTICIPANT_RETURNED, callback);
    }

    onParticipantInvited(callback) {
        this.controller.subscribe(CHAT_EVENTS.PARTICIPANT_INVITED, callback);
    }

    onAutoDisconnection(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTODISCONNECTION, callback);
    }

    onConnectionLost(callback) {
        this.controller.subscribe(CHAT_EVENTS.CONNECTION_LOST, callback);
    }

    onDeepHeartbeatSuccess(callback){
        this.controller.subscribe(CHAT_EVENTS.DEEP_HEARTBEAT_SUCCESS, callback);
    }

    onDeepHeartbeatFailure(callback){
        this.controller.subscribe(CHAT_EVENTS.DEEP_HEARTBEAT_FAILURE, callback);
    }

    onAuthenticationInitiated(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_INITIATED, callback);
    }

    onAuthenticationSuccessful(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_SUCCESSFUL, callback);
    }

    onAuthenticationFailed(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_FAILED, callback);
    }

    onAuthenticationTimeout(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_TIMEOUT, callback);
    }

    onAuthenticationExpired(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_EXPIRED, callback);
    }

    onAuthenticationCanceled(callback) {
        this.controller.subscribe(CHAT_EVENTS.AUTHENTICATION_CANCELED, callback);
    }

    onParticipantDisplayNameUpdated(callback) {
        this.controller.subscribe(CHAT_EVENTS.PARTICIPANT_DISPLAY_NAME_UPDATED, callback);
    }

    onChatRehydrated(callback) {
        this.controller.subscribe(CHAT_EVENTS.CHAT_REHYDRATED, callback);
    }

    onTranscriptUpdated(callback) {
        this.controller.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, callback);
    }

    sendMessage(args) {
        return this.controller.sendMessage(args);
    }

    sendAttachment(args){
        return this.controller.sendAttachment(args);
    }

    downloadAttachment(args){
        return this.controller.downloadAttachment(args);
    }

    getAttachmentURL(args){
        return this.controller.getAttachmentURL(args);
    }

    connect(args) {
        return this.controller.connect(args);
    }

    sendEvent(args) {
        return this.controller.sendEvent(args);
    }

    sendMessageReceipt(args) {
        return this.controller.sendMessageReceipt(args);
    }

    getTranscript(args) {
        return this.controller.getTranscript(args);
    }

    getChatDetails() {
        return this.controller.getChatDetails();
    }

    describeView(args) {
        return this.controller.describeView(args);
    }

    getAuthenticationUrl(args) {
        return this.controller.getAuthenticationUrl(args);
    }

    cancelParticipantAuthentication(args) {
        return this.controller.cancelParticipantAuthentication(args);
    }

    /**
     * Disconnects the WebSocket and unsubscribes handlers WITHOUT ending the
     * contact, so a later connect() resumes it on a fresh socket. Mirrors
     * amazon-connect-chat-ios ChatSession.reset(). To END the contact, use
     * disconnectParticipant().
     */
    reset() {
        return this.controller.reset();
    }
}

class AgentChatSession extends ChatSession {
    constructor(controller) {
        super(controller);
    }

    cleanUpOnParticipantDisconnect() {
        return this.controller.cleanUpOnParticipantDisconnect();
    }
}

class CustomerChatSession extends ChatSession {
    constructor(controller) {
        super(controller);
    }

    disconnectParticipant() {
        return this.controller.disconnectParticipant();
    }
}

export const CHAT_SESSION_FACTORY = new PersistentConnectionAndChatServiceSessionFactory();

var setGlobalConfig = config => {
    var loggerConfig = config.loggerConfig;
    var csmConfig = config.csmConfig;
    GlobalConfig.update(config);
    /**
   * if config.loggerConfig.logger is present - use it in websocketManager
   * if config.loggerConfig.customizedLogger is present - use it in websocketManager
   * if config.loggerConfig.useDefaultLogger is true - use default window.console + default level INFO
   * config.loggerConfig.advancedLogWriter to customize where you want to log advancedLog messages. Default is warn.
   * else no logs from websocketManager - DEFAULT
   *
   * if config.webSocketManagerConfig.isNetworkOnline is present - use it in websocketManager
   * else websocketManager uses "navigator.onLine" - DEFAULT
   */
    WebSocketManager.setGlobalConfig(config);
    LogManager.updateLoggerConfig(loggerConfig);
    if (csmConfig) {
        csmService.updateCsmConfig(csmConfig);
    }
    /**
     * Handle setting message receipts feature in Global Config. If no values are given will default to:
     *   - Message receipts enabled
     *   - Throttle = 5000 ms
     *
     * The receipts feature flag and throttle are re-evaluated only when `config.features`
     * is present. When omitted, the previously configured values are preserved so a
     * subsequent setGlobalConfig call that updates unrelated fields does not unintentionally
     * reset them.
     */
    //Message Receipts enabled by default
    const messageReceiptsConfig = config.features?.messageReceipts;
    if (messageReceiptsConfig === undefined || messageReceiptsConfig === null) {
        // Caller did not configure messageReceipts on this call (undefined or null).
        // Default-enable only if the customer has never explicitly configured them in a prior call.
        if (!GlobalConfig.isMessageReceiptsExplicitlyConfigured()) {
            setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
        }
    } else if (messageReceiptsConfig.shouldSendMessageReceipts !== false) {
        logger.warn("enabling message-receipts by default; to disable set config.features.messageReceipts.shouldSendMessageReceipts = false");
        setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
        GlobalConfig.updateThrottleTime(messageReceiptsConfig.throttleTime);
        GlobalConfig.setMessageReceiptsExplicitlyConfigured();
    } else {
        GlobalConfig.removeFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
        GlobalConfig.updateThrottleTime(messageReceiptsConfig.throttleTime);
        GlobalConfig.setMessageReceiptsExplicitlyConfigured();
    }
};

var setFeatureFlag = feature => {
    GlobalConfig.setFeatureFlag(feature);
};

var ChatSessionConstructor = args => {
    var options = args.options || {};
    var type = args.type || SESSION_TYPES.AGENT;
    GlobalConfig.updateStageRegionCell(options);
    // initialize CSM Service for only customer chat widget
    // Disable CSM service from canary test
    if(!args.disableCSM && type === SESSION_TYPES.CUSTOMER) {
        csmService.loadCsmScriptAndExecute();
    }
    return CHAT_SESSION_FACTORY.createChatSession(
        type,
        args.chatDetails,
        options,//options contain region
        args.websocketManager,
    );
};

var setRegionOverride = regionOverride => {
    GlobalConfig.updateRegionOverride(regionOverride);
};

const ChatSessionObject = {
    create: ChatSessionConstructor,
    setGlobalConfig: setGlobalConfig,
    LogLevel: LogLevel,
    Logger: Logger,
    SessionTypes: SESSION_TYPES,
    csmService: csmService,
    setFeatureFlag: setFeatureFlag,
    setRegionOverride: setRegionOverride
};

export { ChatSessionObject };
