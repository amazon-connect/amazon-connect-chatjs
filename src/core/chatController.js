import {
  UnImplementedMethodException,
  IllegalStateException
} from "./exceptions";
import { ConnectionHelperStatus } from "./connectionHelper";
import {
  PERSISTENCE,
  VISIBILITY,
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  CONTENT_TYPE
} from "../constants";
import { GlobalConfig } from "../globalConfig";
import { LogManager } from "../log";
import Utils from "../utils";

var NetworkLinkStatus = {
  NeverEstablished: "NeverEstablished",
  Establishing: "Establishing",
  Established: "Established",
  Broken: "Broken"
};

/*eslint-disable no-unused-vars*/
class ChatController {
  /**
   *
   * @param {string} textMessage
   * @return a promise object with
   * success = {
   *  "statusCode": 200,
   *  "data": {
   *      "MessageId": <string>
   *      }
   *  }
   * error = {
   *  "statusCode": <errorStatusCode>,
   *  "exception": {} // some object...
   * }
   */
  sendTextMessage(textMessage) {
    throw new UnImplementedMethodException("sendTextMessage in ChatController");
  }

  /**
   *
   * @param {*} args
   * @return Promise object with
   *      response = {
   *              "details": {}, // Implementation specific
   *              "initialContactId": <InitialContactId>,
   *              "contactId":  <contactId>,
   *              "connectSuccess": true
   *      }
   *      error = {
   *              "details": {}, // Implementation specific
   *              "initialContactId": <InitialContactId>,
   *              "contactId":  <contactId>,
   *              "connectSuccess": false
   *      }
   */
  establishNetworkLink(args) {
    throw new UnImplementedMethodException("connectChat in ChatController");
  }

  /**
   * @return null
   */
  disconnectParticipant() {
    throw new UnImplementedMethodException("endChat in ChatController");
  }

  /**
   *
   * @param {string} eventType
   * @return Promise object with
   *  success = {
   *      "statusCode": 200,
   *      "data": {} // empty object? TODO
   *  }
   *  error = {
   *      "statusCode": <errorCode>,
   *      "exception": {} // some object
   *  }
   */
  sendEvent(eventType) {
    throw new UnImplementedMethodException("sendEvent in ChatController");
  }

  /**
   * @param {object} args //TODO
   * @return // TODO
   */
  getTranscript(args) {
    throw new UnImplementedMethodException("getTranscript in ChatController");
  }

  getConnectionStatus() {
    throw new UnImplementedMethodException("getStatus in ChatController");
  }
}
/*eslint-enable no-unused-vars*/

class PersistentConnectionAndChatServiceController extends ChatController {
  constructor(args) {
    super();
    this.setArguments(args);
  }

  setArguments(args) {
    var self = this;
    var prefix = "ContactId-" + args.chatDetails.contactId + ": ";
    this.logger = LogManager.getLogger({
      prefix: prefix
    });
    this.argsValidator = args.argsValidator;
    this.chatEventConstructor = args.chatEventConstructor;
    this.connectionDetails = args.chatDetails.connectionDetails;
    this.intialContactId = args.chatDetails.initialContactId;
    this.contactId = args.chatDetails.contactId;
    this.participantId = args.chatDetails.participantId;
    this.chatClient = args.chatClient;
    this.participantToken = args.chatDetails.participantToken;
    this.reconnectConfig = Object.assign({}, {
      interval: 3000,
      maxRetries: 5,
    }, args.reconnectConfig || {});
    this.connectionHelperCallback = (eventType, eventData) =>
      self._handleConnectionHelperEvents(eventType, eventData);
    this._hasConnectionDetails = args.hasConnectionDetails;
    this.chatControllerFactory = args.chatControllerFactory;
    if (args.hasConnectionDetails) {
      this._setConnectionHelper(
        args.chatDetails.connectionDetails,
        args.chatDetails.contactId
      );
    }
    this._connectCalledAtleastOnce = false;
    this._everConnected = false;
    this.pubsub = args.pubsub;
    this._participantDisconnected = false;
    this.sessionMetadata = {};
  }

  _setConnectionHelper(connectionDetails, contactId) {
    var connectionHelperProvider = this.chatControllerFactory.createConnectionHelperProvider(
      connectionDetails,
      contactId
    );
    this.connectionHelper = connectionHelperProvider(
      this.connectionHelperCallback
    );
  }

  // Do any clean up that needs to be done upon the participant being disconnected from the chat -
  // disconnected here means that the participant is no longer part of ther chat.
  cleanUpOnParticipantDisconnect() {
    this.pubsub.unsubscribeAll();
    this.connectionHelper &&
      this.connectionHelper.cleanUpOnParticipantDisconnect();
  }

  subscribe(eventName, callback) {
    this.pubsub.subscribe(eventName, callback);
    this.logger.info("Subscribed successfully to eventName: ", eventName);
  }

  sendMessage(args) {
    var self = this;
    var message = args.message;
    var type = args.type || CONTENT_TYPE.textPlain;
    var metadata = args.metadata || null;
    self.argsValidator.validateSendMessage(message, type);
    var connectionToken = self.connectionDetails.connectionToken;
    return self.chatClient.sendMessage(connectionToken, message, type).then(
      function(response) {
        response.metadata = metadata;
        self.logger.debug(
          "Successfully sent message, response: ",
          response,
          " request: ",
          args
        );
        return response;
      },
      function(error) {
        error.metadata = metadata;
        self.logger.debug(
          "Failed to send message, error: ",
          error,
          " request: ",
          args
        );
        return Promise.reject(error);
      }
    );
  }

  sendEvent(args) {
    var self = this;
    var metadata = args.metadata || null;
    self.argsValidator.validateSendEvent(args);
    var connectionToken = self.connectionDetails.connectionToken;
    var persistenceArgument = args.persistence || PERSISTENCE.PERSISTED;
    var visibilityArgument = args.visibility || VISIBILITY.ALL;

    return self.chatClient
      .sendEvent(
        connectionToken,
        args.eventType,
        args.messageIds,
        visibilityArgument,
        persistenceArgument
      )
      .then(
        function(response) {
          response.metadata = metadata;
          self.logger.debug(
            "Successfully sent event, response: ",
            response,
            " request: ",
            args
          );
          return response;
        },
        function(error) {
          error.metadata = metadata;
          self.logger.debug(
            "Failed to send event, error: ",
            error,
            " request: ",
            args
          );
          return Promise.reject(error);
        }
      );
  }

  getTranscript(inputArgs) {
    var self = this;
    var metadata = inputArgs.metadata || null;
    var args = {};
    args.IntialContactId = this.intialContactId;
    args.StartKey = inputArgs.StartKey || {};
    args.ScanDirection =
      inputArgs.ScanDirection || TRANSCRIPT_DEFAULT_PARAMS.SCAN_DIRECTION;
    args.SortKey = inputArgs.SortKey || TRANSCRIPT_DEFAULT_PARAMS.SORT_KEY;
    args.MaxResults =
      inputArgs.MaxResults || TRANSCRIPT_DEFAULT_PARAMS.MAX_RESULTS;
    if (inputArgs.NextToken) {
      args.NextToken = inputArgs.NextToken;
    }
    var connectionToken = this.connectionDetails.connectionToken;
    return this.chatClient.getTranscript(connectionToken, args).then(
      function(response) {
        response.metadata = metadata;
        self.logger.debug(
          "Successfully retrieved transcript, response: ",
          response,
          " request: ",
          args
        );
        return response;
      },
      function(error) {
        error.metadata = metadata;
        self.logger.debug(
          "Failed to retrieve transcript, error: ",
          error,
          " request: ",
          args
        );
        return Promise.reject(error);
      }
    );
  }

  _mapConnectionHelperEventToChatEvent(eventType, eventData) {
    try {
      return this.chatEventConstructor.fromConnectionHelperEvent(
        eventType,
        eventData,
        this.getChatDetails(),
        this.logger
      );
    } catch (exc) {
      this.logger.error(
        "Error occured while handling event from Connection. eventType and eventData: ",
        eventType,
        eventData,
        " Causing exception: ",
        exc
      );
      return null;
    }
  }

  _forwardChatEvent(chatEvent) {
    this.logger.debug("Triggering event for subscribers:", chatEvent);
    this.pubsub.triggerAsync(chatEvent.type, chatEvent.data);
  }

  _handleConnectionHelperEvents(eventType, eventData) {
    const chatEvent = this._mapConnectionHelperEventToChatEvent(eventType, eventData);
    if (!chatEvent) {
      return;
    }
    this._handleChatEvent(chatEvent);
    this._forwardChatEvent(chatEvent);
  }

  _handleChatEvent(chatEvent) {
    if (chatEvent.type === CHAT_EVENTS.CONNECTION_BROKEN && GlobalConfig.reconnect && chatEvent.data.reconnect) {
      this._initiateReconnect();
    }
  }

  connect(inputArgs) {
    var args = inputArgs || {};
    this.sessionMetadata = args.metadata || null;
    this.argsValidator.validateConnectChat(args);
    return this._connect();
  }

  _connect() {
    if (!this._canConnect()) {
      throw new IllegalStateException(
        "Can call establishNetworkLink only when getConnectionStatus is Broken or NeverEstablished"
      );
    }
    var _onSuccess = response => this._onConnectSuccess(response, this.sessionMetadata);
    var _onFailure = error => this._onConnectFailure(error, this.sessionMetadata);
    this._connectCalledAtleastOnce = true;
    if (this._hasConnectionDetails) {
      return this.connectionHelper.start().then(_onSuccess, _onFailure);
    } else {
      return this
        ._fetchConnectionDetails()
        .then(connectionDetails => {
          this._setConnectionHelper(connectionDetails, this.contactId);
          this.connectionDetails = connectionDetails;
          this._hasConnectionDetails = true;
          return this.connectionHelper.start();
        })
        .then(_onSuccess, _onFailure);
    }
  }

  _initiateReconnect() {
    Utils
      .asyncWhileInterval(
        (count) => {
          this.logger.info(`Reconnect - ${count}. try`);
          this._hasConnectionDetails = false;
          this.connectionDetails = null;
          return this._connect();
        },
        (count) => count < this.reconnectConfig.maxRetries && this._canReconnect(),
        this.reconnectConfig.interval
      )
      .then(() => {
        this.logger.info(`Reconnect - Success`);
      })
      .catch(() => {
        this.logger.info(`Reconnect - Failed`);
      });
  }

  _canConnect() {
    return (
      !this.connectionHelper ||
      this.getConnectionStatus() === NetworkLinkStatus.Broken ||
      this.getConnectionStatus() === NetworkLinkStatus.NeverEstablished
    );
  }

  _canReconnect() {
    return this.getConnectionStatus() === NetworkLinkStatus.Broken;
  }

  _onConnectSuccess(response, metadata) {
    var self = this;
    self.logger.info("Connect successful!");
    var responseObject = {
      _debug: response,
      connectSuccess: true,
      connectCalled: true,
      metadata: metadata
    };
    var eventData = Object.assign(
      {
        chatDetails: self.getChatDetails()
      },
      responseObject
    );
    this.pubsub.triggerAsync(CHAT_EVENTS.CONNECTION_ESTABLISHED, eventData);
    return responseObject;
  }

  _onConnectFailure(error, metadata) {
    var errorObject = {
      _debug: error,
      connectSuccess: false,
      connectCalled: true,
      metadata: metadata
    };
    this.logger.error("Connect Failed with data: ", errorObject);
    return Promise.reject(errorObject);
  }

  _fetchConnectionDetails() {
    var self = this;
    return self.chatClient.createConnectionDetails(self.participantToken).then(
      function(response) {
        var connectionDetails = {};
        connectionDetails.ConnectionId = response.data.ConnectionId;
        connectionDetails.PreSignedConnectionUrl =
          response.data.PreSignedConnectionUrl;
        connectionDetails.connectionToken =
          response.data.ParticipantCredentials.ConnectionAuthenticationToken;
        return connectionDetails;
      },
      function(error) {
        return Promise.reject({
          reason: "Failed to fetch connectionDetails",
          _debug: error
        });
      }
    );
  }

  breakConnection() {
    return this.connectionHelper.end();
  }

  disconnectParticipant() {
    var self = this;
    var connectionToken = self.connectionDetails.connectionToken;
    return self.chatClient.disconnectChat(connectionToken).then(
      function(response) {
        self.logger.info("disconnect participant successful");
        self._participantDisconnected = true;
        return response;
      },
      function(error) {
        self.logger.error("disconnect participant failed with error: ", error);
        return Promise.reject(error);
      }
    );
  }

  getChatDetails() {
    var self = this;
    return {
      intialContactId: self.intialContactId,
      contactId: self.contactId,
      participantId: self.participantId,
      participantToken: self.participantToken,
      connectionDetails: self.connectionDetails
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
      case ConnectionHelperStatus.Connected:
        return NetworkLinkStatus.Established;
    }
    self.logger.error(
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

export { PersistentConnectionAndChatServiceController, NetworkLinkStatus };
