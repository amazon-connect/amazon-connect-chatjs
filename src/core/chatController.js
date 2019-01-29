import {
  UnImplementedMethodException,
  IllegalStateException
} from "./exceptions";
import { ConnectionHelperStatus } from "./connectionHelper";
import Utils from "../utils";
import {
  PERSISTENCE,
  VISIBILITY,
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS
} from "../constants";

var NetworkLinkStatus = {
  NeverEstablished: "NeverEstablished",
  Establishing: "Establishing",
  Established: "Established",
  BrokenRetrying: "BrokenRetrying",
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
    this.argsValidator = args.argsValidator;
    this.chatEventConstructor = args.chatEventConstructor;
    this.connectionDetails = args.chatDetails.connectionDetails;
    this.intialContactId = args.chatDetails.initialContactId;
    this.contactId = args.chatDetails.contactId;
    this.participantId = args.chatDetails.participantId;
    this.chatClient = args.chatClient;
    this.participantToken = args.chatDetails.participantToken;
    this.connectionHelperCallback = (eventType, eventData) =>
      self._handleConnectionHelperEvents(eventType, eventData);
    this._hasConnectionDetails = args.hasConnectionDetails;
    this.chatControllerFactory = args.chatControllerFactory;
    if (args.hasConnectionDetails) {
      this._setConnectionHelper(args.chatDetails.connectionDetails);
    }
    this._connectCalledAtleastOnce = false;
    this._everConnected = false;
    this.pubsub = args.pubsub;
    this.continuousSuccessFetchConnections = 0;
    this._chatEnded = false;
  }

  _setConnectionHelper(connectionDetails) {
    var connectionHelperProvider = this.chatControllerFactory.createConnectionHelperProvider(
      connectionDetails
    );
    this.connectionHelper = connectionHelperProvider(
      this.connectionHelperCallback
    );
  }

  subscribe(eventName, callback) {
    this.pubsub.subscribe(eventName, callback);
  }

  sendMessage(messageInput, type, optionalParams) {
    var options = optionalParams || {};
    var self = this;
    var requestContext = options.requestContext;
    self.argsValidator.validateSendMessage(messageInput, type);
    var connectionToken = self.connectionDetails.connectionToken;

    var message;
    if (!Utils.isString(messageInput)) {
      message = messageInput.message;
    } else {
      message = messageInput;
    }
    return self.chatClient.sendMessage(connectionToken, message, type).then(
      function(response) {
        response.requestContext = requestContext;
        return response;
      },
      function(error) {
        error.requestContext = requestContext;
        return Promise.reject(error);
      }
    );
  }

  sendEvent(args, optionalParams) {
    var options = optionalParams || {};
    var self = this;
    self.argsValidator.validateSendEvent(args);
    var connectionToken = self.connectionDetails.connectionToken;
    var persistenceArgument = args.persistence || PERSISTENCE.PERSISTED;
    var visibilityArgument = args.visibility || VISIBILITY.ALL;

    var requestContext = options.requestContext;
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
          response.requestContext = requestContext;
          return response;
        },
        function(error) {
          error.requestContext = requestContext;
          return Promise.reject(error);
        }
      );
  }

  getTranscript(inputArgs, optionalParams) {
    var options = optionalParams || {};
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

    var requestContext = options.requestContext;
    return this.chatClient.getTranscript(connectionToken, args).then(
      function(response) {
        response.requestContext = requestContext;
        return response;
      },
      function(error) {
        error.requestContext = requestContext;
        return Promise.reject(error);
      }
    );
  }

  _handleConnectionHelperEvents(eventType, eventData) {
    try {
      var chatEvent = this.chatEventConstructor.fromConnectionHelperEvent(
        eventType,
        eventData,
        this.getChatDetails()
      );
    } catch (exc) {
      // TODO log the exception
      console.log(exc);
      throw exc;
    }
    this.pubsub.triggerAsync(chatEvent.type, chatEvent.data);
  }

  connect(args) {
    var self = this;
    this.argsValidator.validateConnectChat(args);
    if (
      self.getConnectionStatus() !== NetworkLinkStatus.Broken &&
      self.getConnectionStatus() !== NetworkLinkStatus.NeverEstablished
    ) {
      throw new IllegalStateException(
        "Can call establishNetworkLink only when getConnectionStatus is Broken or NeverEstablished"
      );
    }
    var _onSuccess = response => self._onConnectSuccess(response, args);
    var _onFailure = error => self._onConnectFailure(error, args);
    self._connectCalledAtleastOnce = true;
    if (self._hasConnectionDetails) {
      return self.connectionHelper.start().then(_onSuccess, _onFailure);
    } else {
      return self
        ._fetchConnectionDetails()
        .then(function(connectionDetails) {
          self._setConnectionHelper(connectionDetails);
          self.connectionDetails = connectionDetails;
          self._hasConnectionDetails = true;
          return self.connectionHelper.start();
        })
        .then(_onSuccess, _onFailure);
    }
  }

  _onConnectSuccess(response, requestContext) {
    var self = this;
    var responseObject = {
      _debug: response,
      connectSuccess: true,
      connectCalled: true,
      requestContext: requestContext
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

  _onConnectFailure(error, requestContext) {
    var errorObject = {
      _debug: error,
      connectSuccess: false,
      connectCalled: true,
      requestContext: requestContext
    };
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

  disconnectParticipant() {
    // how to handle the failure of the acps disconnect API call?
    // Cant trouble the client to make sure it disconnects the chat be
    // retrying through a button click, at max should have scheduled
    // retry for disconnecting internally without informing the client.
    var self = this;
    self._chatEnded = true;
    var connectionToken = self.connectionDetails.connectionToken;
    setTimeout(function() {
      self.chatClient.disconnectChat(connectionToken);
      self.connectionHelper.end();
    }, 0);
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
      case ConnectionHelperStatus.DisconnectedReconnecting:
        return NetworkLinkStatus.BrokenRetrying;
    }
    // LOG fatal error here. We should never reach here.
  }

  getConnectionStatus() {
    var self = this;
    if (!self._hasConnectionDetails) {
      return NetworkLinkStatus.NeverEstablished;
    }
    return self._convertConnectionHelperStatus(
      self.connectionHelper.getStatus()
    );
  }
}

export { PersistentConnectionAndChatServiceController };
