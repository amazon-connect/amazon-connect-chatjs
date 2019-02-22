import {
  IllegalArgumentException,
  UnImplementedMethodException
} from "./exceptions";

import Paho from "../paho-mqtt";

class ChatConnectionManager {
  createNewMqttConnectionProvider(connectionArgs, type) {
    switch (type) {
      case "PahoMqttConnection":
        return function(callback) {
          connectionArgs.callback = callback;
          return new PahoMqttConnection(connectionArgs);
        };
    }
    throw new IllegalArgumentException(
      "type in ChatConnectionManager.createNewMqttConnectionProvider",
      type
    );
  }
}

// What is the expectation from this class?
// This should provide an interface for connecting + subscribing && disconnecting + unsubscribing to endpoint + topic.
// This class should call back
/*eslint-disable no-unused-vars*/
class MQTTClient {
  /**
   * @param connectionOptions (object) -
   *      connectOptions.useSSL - if present and true, use an SSL Websocket connection.
   *      connectOptions.keepAliveInterval - the server disconnects this client if there is no activity for this number of seconds.
   *      connectOptions.reconnect - Sets whether the client will automatically attempt to reconnect
   *      connectOptions.mqttVersion - The version of MQTT to use to connect to the MQTT Broker.
   *      connectOptions.timeout - If the connect has not succeeded within this number of seconds, it is deemed to have failed.
   *
   * @returns a Promise object -
   *      response = {}
   *      error = {"reason": {} // Implementation specific
   *          }
   */
  connect(connectOptions) {
    throw new UnImplementedMethodException("connect in IotClient");
  }

  disconnect() {
    throw new UnImplementedMethodException("connect in IotClient");
  }

  /**
   * @param subscribeOptions (object) -
   *      subscribeOptions.qos - the maiximum qos of any publications sent as a result of making this subscription.
   *      connectOptions.timeout - which, if present, determines the number of seconds after which the onFailure calback is called.
   *          The presence of a timeout does not prevent the onSuccess callback from being called when the subscribe completes.
   *
   * @returns a Promise object -
   *      response = {"topic": <string>,
   *                  "qos": qos,
   *      }
   *      error = {"topic": <string>,
   *          "error": {} // Implementation specific
   *      }
   */
  subscribe(topic, subscribeOptions) {
    throw new UnImplementedMethodException("connect in IotClient");
  }

  /**
   * @param subscribeOptions (object) -
   *      connectOptions.timeout - which, if present, determines the number of seconds after which the onFailure callback is called.
   *          The presence of a timeout does not prevent the onSuccess callback from being called when the unsubscribe completes.
   *
   * @returns a Promise object -
   *      response = {"topic": <string>,
   *                  "qos": qos,
   *      }
   *      error = {"topic": <string>,
   *          "error": {} // Implementation specific
   *      }
   *
   */
  unsubscribe(topic, unsubscribeOptions) {
    throw new UnImplementedMethodException("connect in IotClient");
  }
}
/*eslint-enable no-unused-vars*/

var MqttConnectionStatus = Object.freeze({
  NeverConnected: "NeverConnected",
  Connecting: "Connecting",
  Connected: "Connected",
  DisconnectedRetrying: "DisconnectedRetrying",
  Disconnected: "Disconnected",
  Reconnecting: "Reconnecting"
});

var MqttEvents = Object.freeze({
  MESSAGE: "Message", // topic, qos, payloadString
  DISCONNECTED_RETRYING: "DisconnectedRetrying", // reason: pahoObject
  DISCONNECTED: "Disconnected", // reason: pahoObject/ "TimeOutInReconnect"
  RECONNECTED: "ReconnectSuccess"
}); // {}

class PahoMqttConnection extends MQTTClient {
  constructor(args) {
    super();
    this.preSignedUrl = args.preSignedUrl;
    this.connectionId = args.connectionId;
    this.status = MqttConnectionStatus.NeverConnected;
    this.pahoClient = new Paho.Client(this.preSignedUrl, this.connectionId);
    var self = this;
    this.pahoClient.onMessageArrived = function(message) {
      self._messageArrivedCallback(message);
    };
    this.pahoClient.onConnectionLost = function(data) {
      self._connectionLostCallBack(data);
    };
    this.pahoClient.onMessageArrived = function(message) {
      self._messageArrivedCallback(message);
    };
    this.callback = args.callback;
    this.killReconnect = null;
    this.maxRetryTime = args.maxRetryTime;
    this.neverConnected = true;
    this._subscribedTopics = [];
  }

  connect(connectOptions) {
    var self = this;
    return new Promise(function(resolve, reject) {
      connectOptions.onSuccess = function(response) {
        self.neverConnected = false;
        var oldStatus = self.status;
        self._onConnectSuccess(response);
        resolve({});
        if (oldStatus === MqttConnectionStatus.DisconnectedRetrying) {
          self.callback(MqttEvents.RECONNECTED, {});
        }
      };
      connectOptions.onFailure = function(error) {
        var errorDetails = {
          reason: error
        };
        self._onConnectFailure(errorDetails);
        reject(errorDetails);
      };
      self.status = MqttConnectionStatus.Connecting;
      self.pahoClient.connect(connectOptions);
    });
  }

  _connectionLostCallBack(error) {
    var data = {
      reason: error
    };
    this._subscribedTopics = [];
    if (this.status === MqttConnectionStatus.Disconnected) {
      return;
    }
    if (data.reason.reconnect) {
      this.status = MqttConnectionStatus.DisconnectedRetrying;
      this.callback(MqttEvents.DISCONNECTED_RETRYING, data);
      this.killReconnect = this._scheduleReconnectKilling();
      return;
    } else {
      this.status = MqttConnectionStatus.Disconnected;
      this.callback(MqttEvents.DISCONNECTED, data);
    }
  }

  _messageArrivedCallback(message) {
    var incomingMessage = {
      topic: message.topic,
      qos: message.qos,
      payloadString: message.payloadString
    };
    this.callback(MqttEvents.MESSAGE, incomingMessage);
  }

  /*eslint-disable no-unused-vars*/
  _onConnectSuccess(response) {
    /*eslint-enable no-unused-vars*/
    if (this.killReconnect !== null) {
      clearTimeout(this.killReconnect);
      this.killReconnect = null;
    }
    this.status = MqttConnectionStatus.Connected;
  }

  /*eslint-disable no-unused-vars*/
  _onConnectFailure(error) {
    /*eslint-enable no-unused-vars*/
    var self = this;
    if (self.neverConnected) {
      self.status = MqttConnectionStatus.NeverConnected;
    } else {
      self.status = MqttConnectionStatus.Disconnected;
    }
  }

  _scheduleReconnectKilling() {
    var self = this;
    return setTimeout(function() {
      self.disconnect();
      self.callback(MqttEvents.DISCONNECTED, { reason: "TimeoutInReconnect" });
    }, self.maxRetryTime * 1000);
  }

  disconnect() {
    this._subscribedTopics = [];
    this.status = MqttConnectionStatus.Disconnected;
    this.pahoClient.disconnect();
  }

  subscribe(topic, subscribeOptions) {
    // should we check if this topic is already subscribed?
    // NO, leave this behaviour to PAHO - whatever PAHO does
    // in case of duplicate subscribe - we will follow the same.
    var self = this;
    return new Promise(function(resolve, reject) {
      subscribeOptions.onSuccess = function(response) {
        self._subscribeSuccess(topic, response);
        var responseObject = {
          topic: topic,
          qos: response.grantedQos
        };
        resolve(responseObject);
      };
      subscribeOptions.onFailure = function(error) {
        var errorObject = {
          topic: topic,
          error: error
        };
        reject(errorObject);
      };
      self.pahoClient.subscribe(topic, subscribeOptions);
    });
  }

  _addToTopics(topic) {
    var self = this;
    if (self._subscribedTopics.indexOf(topic) >= 0) {
      return;
    }
    self._subscribedTopics.push(topic);
  }

  /*eslint-disable no-unused-vars*/
  _subscribeSuccess(topic, response) {
    /*eslint-enable no-unused-vars*/
    this._addToTopics(topic);
  }

  getSubscribedTopics() {
    return this._subscribedTopics.slice(0);
  }

  unsubscribe(topic, unsubscribeOptions) {
    // should we check if this topic is even subscribed?
    // NO, leave this behaviour to PAHO - whatever PAHO does
    // in case of unsubscribe of topics not event subscribed
    // - we will follow the same.
    var self = this;
    return new Promise(function(resolve, reject) {
      unsubscribeOptions.onSuccess = function(response) {
        var responseObject = {
          topic: topic,
          response: response
        };
        self._unsubscribeSuccess(topic, responseObject);
        resolve(responseObject);
      };
      unsubscribeOptions.onFailure = function(error) {
        var errorObject = {
          topic: topic,
          error: error
        };
        reject(errorObject);
      };
      self.pahoClient.unsubscribe(topic, unsubscribeOptions);
    });
  }

  /*eslint-disable no-unused-vars*/
  _unsubscribeSuccess(topic, response) {
    /*eslint-enable no-unused-vars*/
    this._subscribedTopics = this._subscribedTopics.filter(t => t !== topic);
  }

  getStatus() {
    return this.status;
  }
}

export { ChatConnectionManager, MqttEvents, MqttConnectionStatus, MQTTClient };
