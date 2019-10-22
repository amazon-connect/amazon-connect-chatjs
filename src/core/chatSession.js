import {
  UnImplementedMethodException,
  IllegalArgumentException
} from "./exceptions";
import { ChatClientFactory } from "../client/client";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { SESSION_TYPES, CHAT_EVENTS } from "../constants";
import { GlobalConfig } from "../globalConfig";
import { ChatController } from "./chatController";
import { LogManager, LogLevel, Logger } from "../log";

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
    var chatDetails = this.argsValidator.normalizeChatDetails(chatDetailsInput);
    var args = {
      sessionType: sessionType,
      chatDetails: chatDetails,
      chatClient: ChatClientFactory.getCachedClient(options),
      websocketManager: websocketManager
    };
    return new ChatController(args);
  }
}

class ChatSession {
  constructor(controller) {
    this.controller = controller;
  }

  onMessage(callback) {
    this.controller.subscribe(CHAT_EVENTS.INCOMING_MESSAGE, callback);
  }

  onTyping(callback) {
    this.controller.subscribe(CHAT_EVENTS.INCOMING_TYPING, callback);
  }

  onConnectionBroken(callback) {
    this.controller.subscribe(CHAT_EVENTS.CONNECTION_BROKEN, callback);
  }

  onConnectionEstablished(callback) {
    this.controller.subscribe(CHAT_EVENTS.CONNECTION_ESTABLISHED, callback);
  }

  sendMessage(args) {
    return this.controller.sendMessage(args);
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

const CHAT_SESSION_FACTORY = new PersistentConnectionAndChatServiceSessionFactory();

var setGlobalConfig = config => {
  var loggerConfig = config.loggerConfig;
  GlobalConfig.update(config);
  LogManager.updateLoggerConfig(loggerConfig);
};

var ChatSessionConstructor = args => {
  var options = args.options || {};
  var type = args.type || SESSION_TYPES.AGENT;
  return CHAT_SESSION_FACTORY.createChatSession(
    type,
    args.chatDetails,
    options,
    args.websocketManager
  );
};

const ChatSessionObject = {
  create: ChatSessionConstructor,
  setGlobalConfig: setGlobalConfig,
  LogLevel: LogLevel,
  Logger: Logger,
  SessionTypes: SESSION_TYPES
};

export { ChatSessionObject };
