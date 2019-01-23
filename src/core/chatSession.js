import {
  UnImplementedMethodException,
  IllegalArgumentException
} from "./exceptions";
import { ChatClientFactory } from "../client/client";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { ChatConnectionManager } from "./connectionManager";
import { SoloChatConnectionMqttHelper } from "./connectionHelper";
import { SESSION_TYPES, CHAT_EVENTS } from "../constants";
import { EventConstructor } from "./eventConstructor";
import { EventBus } from "./eventbus";

import { PersistentConnectionAndChatServiceController } from "./chatController";

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

  createConnectionHelperProvider(connectionDetails) {
    throw new UnImplementedMethodException(
      "createIncomingChatController in ChatControllerFactory"
    );
  }
  /*eslint-enable no-unused-vars*/
}

class PersistentConnectionAndChatServiceSessionFactory extends ChatSessionFactory {
  constructor() {
    super();
    this.argsValidator = new ChatServiceArgsValidator();
    this.chatConnectionManager = new ChatConnectionManager();
    this.chatClient = ChatClientFactory.getClient("PROD");
    this.chatEventConstructor = new EventConstructor();
  }

  createAgentChatSession(chatDetails) {
    var chatController = this._createChatSession(chatDetails);
    return new AgentChatSession(chatController);
  }

  createCustomerChatSession(chatDetails) {
    var chatController = this._createChatSession(chatDetails);
    return new CustomerChatSession(chatController);
  }

  _createChatSession(chatDetailsInput) {
    var chatDetails = this._normalizeChatDetails(chatDetailsInput);
    var hasConnectionDetails = false;
    if (chatDetails.connectionDetails) {
      hasConnectionDetails = true;
    }
    var args = {
      chatDetails: chatDetails,
      chatControllerFactory: this,
      chatEventConstructor: this.chatEventConstructor,
      pubsub: new EventBus(),
      chatClient: this.chatClient,
      argsValidator: this.argsValidator,
      hasConnectionDetails: hasConnectionDetails
    };
    return new PersistentConnectionAndChatServiceController(args);
  }

  _normalizeChatDetails(chatDetailsInput) {
    if (
      chatDetailsInput.ChatConnectionAttributes &&
      chatDetailsInput.ChatConnectionAttributes.ParticipantCredentials
    ) {
      this.argsValidator.validateInitiateChatResponse(chatDetailsInput);
      var chatDetails = {};
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

  createConnectionHelperProvider(connectionDetails) {
    //later return based on the type argument
    var connectionArgs = {
      preSignedUrl: connectionDetails.PreSignedConnectionUrl,
      connectionId: connectionDetails.ConnectionId,
      maxRetryTime: 120, // not used right now anyways.
      debug: true
    };
    var mqttConnectionProvider = this.chatConnectionManager.createNewMqttConnectionProvider(
      connectionArgs,
      "PahoMqttConnection"
    );
    var args = {
      mqttConnectionProvider: mqttConnectionProvider,
      connectionDetails: {
        preSignedUrl: connectionDetails.PreSignedConnectionUrl,
        connectionId: connectionDetails.ConnectionId
      }
    };
    return function(callback) {
      args.callback = callback;
      return new SoloChatConnectionMqttHelper(args);
    };
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

  sendMessage(message, type, options) {
    return this.controller.sendMessage(message, type, options);
  }

  connect(args, options) {
    return this.controller.connect(
      args,
      options
    );
  }

  sendEvent(args, options) {
    return this.controller.sendEvent(args, options);
  }

  getTranscript(args, options) {
    return this.controller.getTranscript(args, options);
  }

  getConnectionStatus() {
    return this.controller.getConnectionStatus();
  }

  getChatDetails() {
    return this.controller.getChatDetails();
  }
}

class AgentChatSession extends ChatSession {
  constructor(controller) {
    super(controller);
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

var ChatSessionConstructor = (chatDetails, typeParam) => {
  var type = typeParam || SESSION_TYPES.AGENT;
  if (type === SESSION_TYPES.AGENT) {
    return CHAT_SESSION_FACTORY.createAgentChatSession(chatDetails);
  } else if (type === SESSION_TYPES.CUSTOMER) {
    return CHAT_SESSION_FACTORY.createCustomerChatSession(chatDetails);
  } else {
    throw new IllegalArgumentException(
      "Unkown value for session type",
      typeParam
    );
  }
};

export { ChatSessionConstructor };
