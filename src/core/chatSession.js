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

// <<<<<<< HEAD
  // createAgentChatSession(chatDetails, options, websocketManager=null, createTransport=null) {
  //   var chatController = this._createChatSession(chatDetails, options, AGENT_RECONNECT_CONFIG, websocketManager, createTransport);
  //   return new AgentChatSession(chatController);
  // }

  // createCustomerChatSession(chatDetails, options, websocketManager=null, createTransport=null) {
  //   var chatController = this._createChatSession(chatDetails, options, CUSTOMER_RECONNECT_CONFIG, websocketManager, createTransport);
  //   return new CustomerChatSession(chatController);
  // }

  // _createChatSession(chatDetailsInput, options, reconnectConfig, websocketManager=null, createTransport=null) {
// =======
  createChatSession(sessionType, chatDetails, options, websocketManager=null, createTransport=null) {
    const chatController = this._createChatController(sessionType, chatDetails, options, websocketManager, createTransport);
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

  _createChatController(sessionType, chatDetailsInput, options, websocketManager, createTransport) {
// >>>>>>> websocket-migration-fixes
    var chatDetails = this._normalizeChatDetails(chatDetailsInput);
    var args = {
      sessionType: sessionType,
      chatDetails: chatDetails,
      chatClient: ChatClientFactory.getCachedClient(options),
      websocketManager: websocketManager,
      createTransport: createTransport
    };
    return new ChatController(args);
  }

  _normalizeChatDetails(chatDetailsInput) {
    var chatDetails = {};
    if (chatDetailsInput.participantToken || chatDetailsInput.ParticipantToken) {
      chatDetails.participantId = chatDetailsInput.ParticipantId || chatDetailsInput.participantId;
      chatDetails.contactId = chatDetailsInput.ContactId || chatDetailsInput.contactId;
      chatDetails.initialContactId = chatDetailsInput.InitialContactId || chatDetailsInput.initialContactId || chatDetails.contactId;
      chatDetails.participantToken = chatDetailsInput.ParticipantToken || chatDetailsInput.participantToken;
      this.argsValidator.validateChatDetails(chatDetails);
      return chatDetails;
    } else if (
      chatDetailsInput.ChatConnectionAttributes &&
      chatDetailsInput.ChatConnectionAttributes.ParticipantCredentials
    ) {
      this.argsValidator.validateInitiateChatResponse(chatDetailsInput);
      var connectionDetails = {};
      connectionDetails.connectionToken =
        chatDetailsInput.ChatConnectionAttributes.ParticipantCredentials.ConnectionAuthenticationToken;
      connectionDetails.ConnectionId =
        chatDetailsInput.ChatConnectionAttributes.ConnectionId;
      connectionDetails.PreSignedConnectionUrl =
        chatDetailsInput.ChatConnectionAttributes.PreSignedConnectionUrl;
      chatDetails.connectionDetails = connectionDetails;
      chatDetails.participantId = chatDetailsInput.ParticipantId;
      chatDetails.contactId = chatDetailsInput.ContactId;
      chatDetails.initialContactId = chatDetailsInput.ContactId;
      return chatDetails;
    } else {
      this.argsValidator.validateChatDetails(chatDetailsInput);
      return chatDetailsInput;
    }
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
// <<<<<<< HEAD

//   if (type === SESSION_TYPES.AGENT) {
//     return CHAT_SESSION_FACTORY.createAgentChatSession(
//       args.chatDetails,
//       options,
//       args.websocketManager,
//       args.createTransport
//     );
//   } else if (type === SESSION_TYPES.CUSTOMER) {
//     return CHAT_SESSION_FACTORY.createCustomerChatSession(
//       args.chatDetails,
//       options,
//       args.websocketManager,
//       args.createTransport
//     );
//   } else {
//     throw new IllegalArgumentException(
//       "Unkown value for session type, Allowed values are: " +
//         Object.values(SESSION_TYPES),
//       type
//     );
//   }
// =======
  return CHAT_SESSION_FACTORY.createChatSession(
    type,
    args.chatDetails,
    options,
    args.websocketManager,
    args.createTransport
  );
// >>>>>>> websocket-migration-fixes
};

const ChatSessionObject = {
  create: ChatSessionConstructor,
  setGlobalConfig: setGlobalConfig,
  LogLevel: LogLevel,
  Logger: Logger,
  SessionTypes: SESSION_TYPES
};

export { ChatSessionObject };
