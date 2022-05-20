
import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";
import {
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  SESSION_TYPES,
  CONTENT_TYPE
} from "../constants";
import { LogManager } from "../log";
import { EventBus } from "./eventbus";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import ConnectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";

var NetworkLinkStatus = {
  NeverEstablished: "NeverEstablished",
  Establishing: "Establishing",
  Established: "Established",
  Broken: "Broken"
};

var ACCESS_DENIED_EXCEPTION = "AccessDeniedException";

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
    this.logger = LogManager.getLogger({
      prefix: "ChatJS-ChatController",
      logMetaData: args.logMetaData
    });
    this.logMetaData = args.logMetaData;
    this.logger.info("Browser info:", window.navigator.userAgent)
  }

  subscribe(eventName, callback) {
    this.pubsub.subscribe(eventName, callback);
    this.logger.info("Subscribed successfully to event:", eventName);
  }

  handleRequestSuccess(metadata) {
    return response => {
      response.metadata = metadata;
      return response;
    };
  }

  handleRequestFailure(metadata) {
    return error => {
      error.metadata = metadata;
      return Promise.reject(error);
    };
  }

  sendMessage(args) {
    const metadata = args.metadata || null;
    this.argsValidator.validateSendMessage(args);
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .sendMessage(connectionToken, args.message, args.contentType)
      .then(this.handleRequestSuccess(metadata))
      .catch(this.handleRequestFailure(metadata));
  }

  sendAttachment(args){
    const metadata = args.metadata || null;
    //TODO: validation
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
        .sendAttachment(connectionToken, args.attachment, args.metadata)
        .then(this.handleRequestSuccess(metadata))
        .catch(this.handleRequestFailure(metadata));
  }

  downloadAttachment(args){
    const metadata = args.metadata || null;
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
        .downloadAttachment(connectionToken, args.attachmentId)
        .then(this.handleRequestSuccess(metadata))
        .catch(this.handleRequestFailure(metadata));
  }

  sendEvent(args) {
    const metadata = args.metadata || null;
    this.argsValidator.validateSendEvent(args);
    const connectionToken = this.connectionHelper.getConnectionToken();
    const content = args.content || null;
    return this.chatClient
      .sendEvent(
        connectionToken,
        args.contentType,
        content
      )
      .then(this.handleRequestSuccess(metadata))
      .catch(this.handleRequestFailure(metadata));
  }

  getTranscript(inputArgs) {
    if (this.connectionHelper.getStatus() === ConnectionHelperStatus.Ended) {
      this.logger.error(`Get transcript failed! Error: `, ACCESS_DENIED_EXCEPTION, " Connection status ended.");
      return Promise.reject(ACCESS_DENIED_EXCEPTION);
    }
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
      .then(this.handleRequestSuccess(metadata))
      .catch(this.handleRequestFailure(metadata));
  }

  connect(args={}) {
    this.sessionMetadata = args.metadata || null;
    this.argsValidator.validateConnectChat(args);
    const connectionDetailsProvider = this._getConnectionDetailsProvider();
    return connectionDetailsProvider.fetchConnectionToken()
    .then(
      this._initConnectionHelper.bind(this, connectionDetailsProvider)
    )
    .then(
      this._onConnectSuccess.bind(this),
      this._onConnectFailure.bind(this)
    );
  }

  _initConnectionHelper(connectionDetailsProvider) {
    this.connectionHelper = new LpcConnectionHelper(
      this.contactId,
      this.initialContactId,
      connectionDetailsProvider,
      this.websocketManager,
      this.logMetaData
    );
    this.connectionHelper.onEnded(this._handleEndedConnection.bind(this));
    this.connectionHelper.onConnectionLost(this._handleLostConnection.bind(this));
    this.connectionHelper.onConnectionGain(this._handleGainedConnection.bind(this));
    this.connectionHelper.onMessage(this._handleIncomingMessage.bind(this));
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
      const eventType = incomingData.ContentType === CONTENT_TYPE.typing ? CHAT_EVENTS.INCOMING_TYPING : CHAT_EVENTS.INCOMING_MESSAGE;
      this._forwardChatEvent(eventType, {
        data: incomingData,
        chatDetails: this.getChatDetails()
      });
      if (incomingData.ContentType === CONTENT_TYPE.chatEnded) {
        this._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, {
          data: null,
          chatDetails: this.getChatDetails()
        });
        this.breakConnection();
      }
    } catch (e) {
      this.logger.error(
        "Error occured while handling message from Connection. eventData:",
        incomingData,
        " Causing exception:",
        e
      );
    }
  }

  _forwardChatEvent(eventName, eventData) {
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
        contentType: CONTENT_TYPE.connectionAcknowledged
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
    this.logger.error("Connect Failed. Error: ", errorObject);
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
      .disconnectParticipant(connectionToken)
      .then(response => {
        this.logger.info("Disconnect participant successfully");
        this._participantDisconnected = true;
        this.cleanUpOnParticipantDisconnect();
        this.breakConnection();
        return response;
      }, error => {
        this.logger.error("Disconnect participant failed. Error:", error);
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