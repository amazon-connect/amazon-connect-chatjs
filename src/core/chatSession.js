import {
    UnImplementedMethodException,
    IllegalArgumentException
} from "./exceptions";
import { ChatClientFactory } from "../client/client";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { SESSION_TYPES, CHAT_EVENTS, CSM_CATEGORY, START_CHAT_SESSION, DEFAULT_THROTTLE_TIME } from "../constants";
import { GlobalConfig } from "../globalConfig";
import { ChatController } from "./chatController";
import { LogManager, LogLevel, Logger } from "../log";
import WebSocketManager from "../lib/amazon-connect-websocket-manager";
import { csmService } from "../service/csmService";
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

    createChatSession(sessionType, chatDetails, options, websocketManager, features) {
        const chatController = this._createChatController(sessionType, chatDetails, options, websocketManager, features);
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

    _createChatController(sessionType, chatDetailsInput, options, websocketManager, features) {
        var chatDetails = this.argsValidator.normalizeChatDetails(chatDetailsInput);
        var logMetaData = {
            contactId: chatDetails.contactId,
            participantId: chatDetails.participantId,
            sessionType
        };
        var chatClient = ChatClientFactory.getCachedClient(options, logMetaData);
        var args = {
            sessionType: sessionType,
            chatDetails,
            chatClient,
            websocketManager: websocketManager,
            logMetaData,
            features,
        };
        return new ChatController(args);
    }
}

class ChatSession {
    constructor(controller) {
        this.controller = controller;
        csmService.addCountMetric(START_CHAT_SESSION, CSM_CATEGORY.UI);
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

    sendMessage(args) {
        return this.controller.sendMessage(args);
    }

    sendAttachment(args) {
        return this.controller.sendAttachment(args);
    }

    downloadAttachment(args) {
        return this.controller.downloadAttachment(args);
    }

    connect(args) {
        return this.controller.connect(args);
    }

    sendEvent(args) {
        return this.controller.sendEvent(args);
    }

    getTranscript(args) {
        return this.controller.getTranscript(args);
    }

    getChatDetails() {
        return this.controller.getChatDetails();
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
    /**
    * if config.loggerConfig.logger is present - use it in websocketManager
    * if config.loggerConfig.customizedLogger is present - use it in websocketManager
    * if config.loggerConfig.useDefaultLogger is true - use default window.console + default level INFO
    * config.loggerConfig.advancedLogWriter to customize where you want to log advancedLog messages. Default is warn.
    * else no logs from websocketManager - DEFAULT
    */
    WebSocketManager.setGlobalConfig(config);
    GlobalConfig.update(config);
    LogManager.updateLoggerConfig(loggerConfig);
    if (csmConfig) {
        csmService.updateCsmConfig(csmConfig);
    }
};

var ChatSessionConstructor = args => {
    var options = args.options || {};
    //Message Receipts enabled by default
    const features = {
        messageReceipts: {
            shouldSendMessageReceipts: args.features?.messageReceipts?.shouldSendMessageReceipts ? args.features?.messageReceipts?.shouldSendMessageReceipts : true,
            thorttleTime: args.features?.messageReceipts?.thorttleTime || DEFAULT_THROTTLE_TIME,
        }
    };
    var type = args.type || SESSION_TYPES.AGENT;
    GlobalConfig.updateStageRegion(options);
    // initialize CSM Service for only customer chat widget
    if (!args.disableCSM && type === SESSION_TYPES.CUSTOMER) {
        csmService.initializeCSM();
    }
    return CHAT_SESSION_FACTORY.createChatSession(
        type,
        args.chatDetails,
        options,//options contain region 
        args.websocketManager,
        features
    );
};

const ChatSessionObject = {
    create: ChatSessionConstructor,
    setGlobalConfig: setGlobalConfig,
    LogLevel: LogLevel,
    Logger: Logger,
    SessionTypes: SESSION_TYPES,
    csmService: csmService,
};

export { ChatSessionObject };
