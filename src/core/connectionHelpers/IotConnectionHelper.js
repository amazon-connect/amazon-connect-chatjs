import { PahoMqttClient, MqttEvents } from "../../client/pahoMqttClient";
import { EventBus } from "../eventbus";
import { GlobalConfig } from "../../globalConfig";
import { LogManager } from "../../log";
import { NetworkInfo } from "../networkInfo";
import { MQTT_CONSTANTS } from "../../constants";
import { IllegalStateException } from "../exceptions";
import Utils from "../../utils";

import {
  ConnectionHelperEvents,
  ConnectionHelperStatus
} from "./baseConnectionHelper";
import BaseConnectionHelper from "./baseConnectionHelper";

class IotConnectionHelper extends BaseConnectionHelper {

  constructor(contactId, connectionDetailsProvider, reconnectConfig) {
    super(connectionDetailsProvider);
    this.logger = LogManager.getLogger({
      prefix: "ContactId-" + contactId + ": "
    });
    this.status = ConnectionHelperStatus.NeverStarted;
    this.eventBus = new EventBus();
    this._unsubscribeFunctions = [];
    this.reconnectConfig = reconnectConfig;
    this._connectCalledAtleastOnce = false;
    this._setNetworkEventHandlers();
  }

  start() {
    super.start();
    if (this.status !== ConnectionHelperStatus.NeverStarted) {
      throw new IllegalStateException("Connection helper started twice!!");
    }
    this.status = ConnectionHelperStatus.Starting;
    return this._initiateConnectWithRetry();
  }

  end() {
    super.end();
    this._handleBrokenConnection({ reason: "user action" });
    this.iotConnection && this.iotConnection.disconnect();
  }

  getStatus() {
    return this.status;
  }

  _initIotConnection(connectionDetails) {
    this.iotConnection = new PahoMqttClient({
      preSignedUrl: connectionDetails.preSignedConnectionUrl,
      connectionId: connectionDetails.connectionId,
      callback: this._handleIotEvent.bind(this)
    });
  }

  _connect() {
    this._connectCalledAtleastOnce = true;
    return this.connectionDetailsProvider
      .fetchConnectionDetails()
      .then(this._initIotConnection.bind(this))
      .then(() => {
        const connectOptions = {
          useSSL: true,
          keepAliveInterval: MQTT_CONSTANTS.KEEP_ALIVE,
          reconnect: false,
          mqttVersion: 4,
          timeout: MQTT_CONSTANTS.CONNECT_TIMEOUT
        };
        return new Promise((resolve, reject) => {
          this.iotConnection
            .connect(connectOptions)
            .then(response => {
              this._subscribe(resolve, reject, response);
            })
            .catch(error => {
              this._connectFailed(reject, error);
            });
        });
      });
  }

  _connectFailed(reject, connectError) {
    var error = {
      connectSuccess: false,
      reason: "ConnectionToBrokerFailed",
      details: connectError
    };
    reject(error);
  }

  _subscribe(resolve, reject) {
    const subscribeOptions = {
      qos: 1
    };
    this.iotConnection
      .subscribe(this.connectionDetailsProvider.connectionDetails.connectionId, subscribeOptions)
      .then(response => {
        this._postSubscribe(resolve, response);
      })
      .catch(error => {
        this._subscribeFailed(reject, error);
      });
  }

  _postSubscribe(resolve, subscribeResponse) {
    const response = {
      details: subscribeResponse,
      connectSuccess: true
    };
    resolve(response);
  }

  _subscribeFailed(reject, subscribeError) {
    const error = {
      connectSuccess: false,
      details: subscribeError,
      reason: "SubscribtionToTopicFailed"
    };
    this.iotConnection.disconnect();
    reject(error);
  }

  _handleIotEvent(eventType, eventData) {
    switch (eventType) {
      case MqttEvents.MESSAGE:
        this.logger.debug("Received incoming data", eventData.payloadString);
        this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, eventData);
        break;
      case MqttEvents.DISCONNECTED:
        if (GlobalConfig.reconnect && eventData.reason.errorCode !== 0) {
          this._handleLostConnection(eventData);
        } else {
          this._handleBrokenConnection(eventData);
        }
        break;
    }
  }

  _initiateConnectWithRetry() {
    if (!this._initiateConnectPromise) {
      this._initiateConnectPromise = Utils
        .asyncWhileInterval(
          (count) => {
            this.logger.info(`Connect - ${count}. try`);
            return this._connect();
          },
          (count) => count < this.reconnectConfig.maxRetries && this._canConnect(),
          this.reconnectConfig.interval
        )
        .then(() => {
          this.logger.info(`Connect - Success`);
          this._handleGainedConnection();
        })
        .catch((e) => {
          this.logger.info(`Connect - Failed`);
          if (NetworkInfo.isOnline()) {
            this._handleBrokenConnection(e);
            this.iotConnection && this.iotConnection.disconnect();
          } else if (this.state !== ConnectionHelperStatus.ConnectionLost) {
            this._handleLostConnection(e);
          }
          return Promise.reject(e);
        })
        .finally(() => {
          this._initiateConnectPromise = null;
        });
    }
    return this._initiateConnectPromise;
  }

  _canConnect() {
    return (
      NetworkInfo.isOnline() && (
        this.status === ConnectionHelperStatus.ConnectionLost ||
        this.status === ConnectionHelperStatus.Starting
      )
    );
  }

  _handleBrokenConnection(eventData) {
    if (this.status === ConnectionHelperStatus.Ended) {
      return;
    }
    this.status = ConnectionHelperStatus.Ended;
    // Do we explicitly have to unsubscribe before disconnecting MQTT?
    this._unsubscribeFunctions.forEach(f => f());
    this.eventBus.trigger(ConnectionHelperEvents.Ended, eventData);
  }

  _handleLostConnection(eventData) {
    this.status = ConnectionHelperStatus.ConnectionLost;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionLost, eventData);
    if (NetworkInfo.isOnline()) {
      this._initiateConnectWithRetry().catch(() => {});
    }
  }

  _handleGainedConnection() {
    this.status = ConnectionHelperStatus.Connected;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionGained, {});
  }

  _setNetworkEventHandlers() {
    const unsubscribe = NetworkInfo.onOnline(() => {
      if (this._connectCalledAtleastOnce && this._canConnect()) {
        this._initiateConnectWithRetry().catch(() => {});
      }
    });
    this._unsubscribeFunctions.push(unsubscribe);
  }

  onEnded(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.Ended, handler);
  }

  onConnectionLost(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionLost, handler);
  }

  onConnectionGain(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionGained, handler);
  }

  onMessage(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.IncomingMessage, handler);
  }
}


export default IotConnectionHelper;
