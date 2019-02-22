import {
  UnImplementedMethodException,
  IllegalArgumentException,
  IllegalStateException
} from "./exceptions";
import { MqttConnectionStatus, MqttEvents } from "./connectionManager";
import { MQTT_CONSTANTS } from "../constants";
import { LogManager } from "../log";

/**
 * This class is used for establishing a connection for the chat.
 * The object of this class can only be started once and can only be closed once.
 * If the connection fails to establish, or if it ends abruptly due to
 *  downstream issues, or it is ended explicitly by calling end()
 *  then this object can no longer be used. A new object must be created to call start again.
 * start() attempts to start a connection.
 */
/*eslint-disable no-unused-vars*/
class ConnectionHelper {
  /**
   *   returns Promise object with
   *       response = {
   *         connectSuccess: true,
   *         details: {} // Implementation specific
   *       };
   *       error = {
   *         connectSuccess: false,
   *         reason: "" // Implementation specific
   *         details: {} // Implementation specific
   *       };
   */
  start(args) {
    throw new UnImplementedMethodException("start in ConnectionHelper");
  }

  end() {
    throw new UnImplementedMethodException("end in ConnectionHelper");
  }
}
/*eslint-enable no-unused-vars*/

var ConnectionHelperStatus = {
  NeverStarted: "NeverStarted",
  Starting: "Starting",
  Connected: "Connected",
  DisconnectedReconnecting: "DisconnectedReconnecting",
  Ended: "Ended"
};

var ConnectionHelperEvents = {
  Ended: "Ended", // event data is: {reason: ...}
  DisconnectedReconnecting: "DisconnectedReconnecting", // event data is: {reason: ...}
  Reconnected: "Reconnected", // event data is: {}
  IncomingMessage: "IncomingMessage" // event data is: {payloadString: ...}
};

/*
This implementation assumes that it has its own MQTT client 
which has never been connected and will not be shared with anyone.
*/
// TODO - below can be changed with Promise Chaining.
class SoloChatConnectionMqttHelper extends ConnectionHelper {
  constructor(args) {
    super();
    var prefix = "ContactId-" + args.contactId + ": ";
    this.logger = LogManager.getLogger({
      prefix: prefix
    });
    this.preSignedUrl = args.connectionDetails.preSignedUrl;
    this.topic = args.connectionDetails.connectionId;
    this.considerParticipantAsDisconnected = false;
    this.iotConnection = args.mqttConnectionProvider((eventType, eventData) =>
      this._handleIotEvent(eventType, eventData)
    );
    if (
      this.iotConnection.getStatus() !== MqttConnectionStatus.NeverConnected
    ) {
      throw new IllegalArgumentException(
        "iotConnection is expected to be in NeverConnected state but is not"
      )();
    }
    this.chatControllerCallback = args.callback;
    this.status = ConnectionHelperStatus.NeverStarted;
  }

  // Add any functionality that you want this to do,
  // if the participant is to be considered as disconnected.
  // disconnect here means that the participant is no longer part of ther chat.
  // it is independent of the actual websocket connection being connected or not.
  // participant can no longer send and recieve messages to the backend.
  cleanUpOnParticipantDisconnect() {
    // Right now, nothing depends on this field.
    // However in future we might prevent retires on connection if this field is set to true.
    this.considerParticipantAsDisconnected = true;
  }

  start() {
    if (this.status !== ConnectionHelperStatus.NeverStarted) {
      throw new IllegalStateException("Connection helper started twice!!");
    }
    var self = this;
    this.status = ConnectionHelperStatus.Starting;
    return new Promise(self._createStartPromise());
  }

  _createStartPromise() {
    var self = this;
    return function(resovle, reject) {
      self._connect(resovle, reject);
    };
  }

  _connect(resolve, reject) {
    var self = this;
    var connectOptions = {
      useSSL: true,
      keepAliveInterval: MQTT_CONSTANTS.KEEP_ALIVE,
      reconnect: false,
      mqttVersion: 4,
      timeout: MQTT_CONSTANTS.CONNECT_TIMEOUT
    };
    self.iotConnection
      .connect(connectOptions)
      .then(function(response) {
        self._postConnect(resolve, reject, response);
      })
      .catch(function(error) {
        self._connectFailed(reject, error);
      });
  }

  _postConnect(resolve, reject, connectResponse) {
    this._subscribe(resolve, reject, connectResponse);
  }

  _connectFailed(reject, connectError) {
    var error = {
      connectSuccess: false,
      reason: "ConnectionToBrokerFailed",
      details: connectError
    };
    this.status = ConnectionHelperStatus.Ended;
    reject(error);
  }

  /*eslint-disable no-unused-vars*/
  _subscribe(resolve, reject, connectResponse) {
    /*eslint-enable no-unused-vars*/
    var self = this;
    var subscribeOptions = {
      qos: 1
    };
    self.iotConnection
      .subscribe(self.topic, subscribeOptions)
      .then(function(response) {
        self._postSubscribe(resolve, response);
      })
      .catch(function(error) {
        self._subscribeFailed(reject, error);
      });
  }

  _postSubscribe(resolve, subscribeResponse) {
    var response = {
      details: subscribeResponse,
      connectSuccess: true
    };
    this.status = ConnectionHelperStatus.Connected;
    resolve(response);
  }

  _subscribeFailed(reject, subscribeError) {
    var error = {
      connectSuccess: false,
      details: subscribeError,
      reason: "SubscribtionToTopicFailed"
    };
    var self = this;
    self.status = ConnectionHelperStatus.Ended;
    self.iotConnection.disconnect();
    reject(error);
  }

  _handleIotEvent(eventType, eventData) {
    switch (eventType) {
      case MqttEvents.MESSAGE:
        this.logger.debug("Received incoming data", eventData.payloadString);
        this.chatControllerCallback(
          ConnectionHelperEvents.IncomingMessage,
          eventData
        );
        break;
      case MqttEvents.DISCONNECTED_RETRYING:
        console.log("ERROR. Received unexpected event DISCONNECTED_RETRYING");
        break;
      case MqttEvents.DISCONNECTED:
        this.status = ConnectionHelperStatus.Ended;
        this.chatControllerCallback(ConnectionHelperEvents.Ended, eventData);
        break;
      case MqttEvents.RECONNECTED:
        console.log("ERROR. Received unexpected event DISCONNECTED_RETRYING");
        break;
    }
  }

  end() {
    this.status = ConnectionHelperStatus.Ended;
    // Do we explicitly have to unsubscribe before disconnecting MQTT?
    this.iotConnection.disconnect();
  }

  getStatus() {
    return this.status;
  }
}

export {
  SoloChatConnectionMqttHelper,
  ConnectionHelperEvents,
  ConnectionHelperStatus,
  ConnectionHelper
};
