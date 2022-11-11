import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";
import {
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  SESSION_TYPES,
  CONTENT_TYPE,
  CSM_CATEGORY,
  ACPS_METHODS,
  CHAT_EVENT_TYPE_MAPPING
} from "../constants";
import { LogManager } from "../log";
import { EventBus } from "./eventbus";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import ConnectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import { csmService } from "../service/csmService";
import MessageReceiptsUtil from './MessageReceiptsUtil';

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
    this.shouldSendMessageReceipts = args.features?.messageReceipts?.shouldSendMessageReceipts;
    this.throttleTime = args.features?.messageReceipts?.throttleTime;
    this.messageReceiptUtil = new MessageReceiptsUtil(args.logMetaData);
    this.logger.info("Browser info:", window.navigator.userAgent)
  }

  subscribe(eventName, callback) {
    this.pubsub.subscribe(eventName, callback);
    this._sendInternalLogToServer(this.logger.info("Subscribed successfully to event:", eventName));
  }

  handleRequestSuccess(metadata, method, startTime, contentType) {
    return response => this.handleResponse(metadata, method, startTime, contentType, response, false);
  }

  handleRequestFailure(metadata, method, startTime, contentType) {
    return error => this.handleResponse(metadata, method, startTime, contentType, error, true);
  }

  handleResponse(metadata, method, startTime, contentType, responseData, isFailed) {
    const contentTypeDimension = contentType ?
      [
        {
          name: "ContentType",
          value: contentType
        }
      ]
      : [];
    csmService.addLatencyMetricWithStartTime(method, startTime, CSM_CATEGORY.API, contentTypeDimension);
    csmService.addCountAndErrorMetric(method, CSM_CATEGORY.API, isFailed, contentTypeDimension);
    responseData.metadata = metadata;
    return isFailed ? Promise.reject(responseData) : responseData;
  }

  sendMessage(args) {
    const startTime = new Date().getTime();
    const metadata = args.metadata || null;
    this.argsValidator.validateSendMessage(args);
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .sendMessage(connectionToken, args.message, args.contentType)
      .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType))
      .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_MESSAGE, startTime, args.contentType));
  }

  sendAttachment(args) {
    const startTime = new Date().getTime();
    const metadata = args.metadata || null;
    //TODO: validation
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .sendAttachment(connectionToken, args.attachment, args.metadata)
      .then(this.handleRequestSuccess(metadata, ACPS_METHODS.SEND_ATTACHMENT, startTime, args.attachment.type))
      .catch(this.handleRequestFailure(metadata, ACPS_METHODS.SEND_ATTACHMENT, startTime, args.attachment.type));
  }

  downloadAttachment(args) {
    const startTime = new Date().getTime();
    const metadata = args.metadata || null;
    const connectionToken = this.connectionHelper.getConnectionToken();
    return this.chatClient
      .downloadAttachment(connectionToken, args.attachmentId)
      .then(this.handleRequestSuccess(metadata, ACPS_METHODS.DOWNLOAD_ATTACHMENT, startTime))
      .catch(this.handleRequestFailure(metadata, ACPS_METHODS.DOWNLOAD_ATTACHMENT, startTime));
  }

  sendEvent(args) {
    const startTime = new Date().getTime();
    const metadata = args.metadata || null;
    this.argsValidator.validateSendEvent(args);
    const connectionToken = this.connectionHelper.getConnectionToken();
    const content = args.content || null;
    var eventType = getEventTypeFromContentType(args.contentType);
    var parsedContent = typeof content === "string" ? JSON.parse(content) : content;
    if (this.messageReceiptUtil.isMessageReceipt(eventType, args)) {
      // Ignore all MessageReceipt events
      if(!this.shouldSendMessageReceipts || !parsedContent.MessageId) {
        this.logger.warn("Ignoring messageReceipt: missing messageId", args);
        return;
      }
      // Prioritize and send selective message receipts
      return this.messageReceiptUtil.prioritizeAndSendMessageReceipt(this.chatClient, this.chatClient.sendEvent,
        connectionToken,
        args.contentType,
        content,
        eventType,
        this.throttleTime)
        .then(this.handleRequestSuccess(metadata))
        .catch(this.handleRequestFailure(metadata));
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

  getTranscript(inputArgs) {
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
      .then(this.messageReceiptUtil.rehydrateReceiptMappers(this.handleRequestSuccess(metadata), this.shouldSendMessageReceipts))
      .catch(this.handleRequestFailure(metadata, ACPS_METHODS.GET_TRANSCRIPT, startTime));

  }

  connect(args = {}) {
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
    this.breakConnection();
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
        this._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, {
          data: null,
          chatDetails: this.getChatDetails()
        });
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

  _onConnectSuccess(response) {
    this._sendInternalLogToServer(this.logger.info("Connect successful!"));

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
        return response;
      }, error => {
        csmService.addLatencyMetricWithStartTime(ACPS_METHODS.DISCONNECT_PARTICIPANT, startTime, CSM_CATEGORY.API);
        csmService.addCountAndErrorMetric(ACPS_METHODS.DISCONNECT_PARTICIPANT, CSM_CATEGORY.API, true);
        this._sendInternalLogToServer(this.logger.error("Disconnect participant failed. Error:", error));

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
}

export const getEventTypeFromContentType = (contentType) => {
  return CHAT_EVENT_TYPE_MAPPING[contentType] || CHAT_EVENT_TYPE_MAPPING.default;
}

export { ChatController, NetworkLinkStatus };
