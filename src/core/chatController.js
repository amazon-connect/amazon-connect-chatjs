import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";
import {
  PERSISTENCE,
  VISIBILITY,
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  CONTENT_TYPE,
  AGENT_RECONNECT_CONFIG,
  CUSTOMER_RECONNECT_CONFIG,
  SESSION_TYPES
} from "../constants";
import { LogManager } from "../log";
import { EventBus } from "./eventbus";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import connectionHelperProvider from "./connectionHelpers/connectionHelperProvider";

var NetworkLinkStatus = {
  NeverEstablished: "NeverEstablished",
  Establishing: "Establishing",
  Established: "Established",
  Broken: "Broken"
};

class ChatController {

  constructor(args) {
    this.logger = LogManager.getLogger({
      prefix: "ContactId-" + args.chatDetails.contactId + ": "
    });
    this.argsValidator = new ChatServiceArgsValidator();
    this.pubsub = new EventBus();

    this.sessionType = args.sessionType;
    this.connectionDetails = args.chatDetails.connectionDetails;
    this.intialContactId = args.chatDetails.initialContactId;
    this.contactId = args.chatDetails.contactId;
    this.participantId = args.chatDetails.participantId;
    this.chatClient = args.chatClient;
    this.participantToken = args.chatDetails.participantToken;
    this.websocketManager = args.websocketManager;
    this.createConnectionToken = args.createConnectionToken;
    this._participantDisconnected = false;
    this.sessionMetadata = {};
  }

  subscribe(eventName, callback) {
    this.pubsub.subscribe(eventName, callback);
    this.logger.info("Subscribed successfully to eventName: ", eventName);
  }

  handleRequestSuccess(metadata, request, requestName) {
    return response => {
      response.metadata = metadata;
      this.logger.debug(`${requestName} successful! Response: `, response, " / Request: ", request);
      return response;
    };
  }

  handleRequestFailure(metadata, request, requestName) {
    return error => {
      error.metadata = metadata;
      this.logger.debug(`${requestName} failed! Error: `, error, " / Request: ", request);
      return Promise.reject(error);
    };
  }

  sendMessage(args) {
    const message = args.message;
    const type = args.type || CONTENT_TYPE.textPlain;
    const metadata = args.metadata || null;
    this.argsValidator.validateSendMessage(message, type);
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .sendMessage(connectionToken, message, type)
      .then(this.handleRequestSuccess(metadata, args, "sendMessage"))
      .catch(this.handleRequestFailure(metadata, args, "sendMessage"));
  }

  sendEvent(args) {
    const metadata = args.metadata || null;
    this.argsValidator.validateSendEvent(args);
    const connectionToken = this.connectionHelper.getConnectionToken();
    const persistenceArgument = args.persistence || PERSISTENCE.PERSISTED;
    const visibilityArgument = args.visibility || VISIBILITY.ALL;

    return this.chatClient
      .sendEvent(
        connectionToken,
        args.eventType,
        args.messageIds,
        visibilityArgument,
        persistenceArgument
      )
      .then(this.handleRequestSuccess(metadata, args, "sendEvent"))
      .catch(this.handleRequestFailure(metadata, args, "sendEvent"));
  }

  getTranscript(inputArgs) {
    const metadata = inputArgs.metadata || null;
    const args = {
      IntialContactId: this.intialContactId,
      StartKey: inputArgs.StartKey || {},
      ScanDirection: inputArgs.ScanDirection || TRANSCRIPT_DEFAULT_PARAMS.SCAN_DIRECTION,
      SortKey: inputArgs.SortKey || TRANSCRIPT_DEFAULT_PARAMS.SORT_KEY,
      MaxResults: inputArgs.MaxResults || TRANSCRIPT_DEFAULT_PARAMS.MAX_RESULTS
    };
    if (inputArgs.NextToken) {
      args.NextToken = inputArgs.NextToken;
    }
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .getTranscript(connectionToken, args)
      .then(this.handleRequestSuccess(metadata, args, "getTranscript"))
      .catch(this.handleRequestFailure(metadata, args, "getTranscript"));
  }

  connect(args={}) {
    this.sessionMetadata = args.metadata || null;
    this.argsValidator.validateConnectChat(args);

    return connectionHelperProvider
      .get(
        this.contactId,
        this.participantId,
        this.intialContactId,
        this.connectionDetails,
        this.participantToken,
        this.chatClient,
        this.websocketManager,
        this.createConnectionToken,
        this.sessionType === SESSION_TYPES.AGENT ? AGENT_RECONNECT_CONFIG : CUSTOMER_RECONNECT_CONFIG
      )
      .then(
        this._initConnectionHelper.bind(this)
      )
      .then(
        this._onConnectSuccess.bind(this),
        this._onConnectFailure.bind(this)
      );
  }

  _initConnectionHelper(connectionHelper) {
    this.connectionHelper = connectionHelper;
    this.connectionHelper.onEnded(this._handleEndedConnection.bind(this));
    this.connectionHelper.onConnectionLost(this._handleLostConnection.bind(this));
    this.connectionHelper.onConnectionGain(this._handleGainedConnection.bind(this));
    this.connectionHelper.onMessage(this._handleIncomingMessage.bind(this));
    return this.connectionHelper.start();
  }

  _handleEndedConnection(eventData) {
    this._forwardChatEvent(CHAT_EVENTS.CONNECTION_BROKEN, {
      data: eventData,
      chatDetails: this.getChatDetails()
    });
  }

  _handleLostConnection(eventData) {
    this._forwardChatEvent(CHAT_EVENTS.CONNECTION_LOST, {
      data: eventData,
      chatDetails: this.getChatDetails()
    });
  }

  _handleGainedConnection(eventData) {
    this._forwardChatEvent(CHAT_EVENTS.CONNECTION_ESTABLISHED, {
      data: eventData,
      chatDetails: this.getChatDetails()
    });
  }

  _handleIncomingMessage(incomingData) {
    try {
      const eventType = {
        TYPING: CHAT_EVENTS.INCOMING_TYPING
      }[incomingData.Data.Type] || CHAT_EVENTS.INCOMING_MESSAGE;
      this._forwardChatEvent(eventType, {
        data: incomingData,
        chatDetails: this.getChatDetails()
      });
    } catch (e) {
      this.logger.error(
        "Error occured while handling message from Connection. eventData: ",
        incomingData,
        " Causing exception: ",
        e
      );
    }
  }

  _forwardChatEvent(eventName, eventData) {
    this.logger.debug("Triggering event for subscribers:", eventName, eventData);
    this.pubsub.triggerAsync(eventName, eventData);
  }

  _onConnectSuccess(response) {
    this.logger.info("Connect successful!");
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

    if (this._shouldAcknowledgeContact()) {
      this.sendEvent({
        eventType: "CONNECTION_ACK",
        messageIds: [],
        visibility: VISIBILITY.ALL,
        persistence: PERSISTENCE.NON_PERSISTED
      });
    }

    return responseObject;
  }

  _onConnectFailure(error) {
    const errorObject = {
      _debug: error,
      connectSuccess: false,
      connectCalled: true,
      metadata: this.sessionMetadata
    };
    this.logger.error("Connect Failed with data: ", errorObject);
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
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .disconnectChat(connectionToken)
      .then(response => {
        this.logger.info("disconnect participant successful");
        this._participantDisconnected = true;
        this.cleanUpOnParticipantDisconnect();
        this.breakConnection();
        return response;
      }, error => {
        this.logger.error("disconnect participant failed with error: ", error);
        return Promise.reject(error);
      });
  }

  getChatDetails() {
    return {
      intialContactId: this.intialContactId,
      contactId: this.contactId,
      participantId: this.participantId,
      participantToken: this.participantToken,
      connectionDetails: this.connectionDetails
    };
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
    }
    this.logger.error(
      "Reached invalid state. Unknown connectionHelperStatus: ",
      connectionHelperStatus
    );
  }

  getConnectionStatus() {
    return this._convertConnectionHelperStatus(
      this.connectionHelper.getStatus()
    );
  }
}

export { ChatController, NetworkLinkStatus };
