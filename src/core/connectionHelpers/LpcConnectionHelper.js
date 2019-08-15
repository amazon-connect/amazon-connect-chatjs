import { EventBus } from "../eventbus";

import { 
  ConnectionHelperEvents,
  ConnectionHelperStatus
} from "./baseConnectionHelper";
import BaseConnectionHelper from "./baseConnectionHelper";


class LpcConnectionHelper {

  constructor(contactId, connectionDetailsProvider, websocketManager) {
    if (!LpcConnectionHelper.singleton) {
      LpcConnectionHelper.singleton = new LPCConnectionHelperBase(connectionDetailsProvider, websocketManager);
      this.isFirstInstance = true;
    }

    this.contactId = contactId;
    this.eventBus = new EventBus();
    this.subscriptions = [
      LpcConnectionHelper.singleton.onEnded(this.handleEnded.bind(this)),
      LpcConnectionHelper.singleton.onConnectionGain(this.handleConnectionGain.bind(this)),
      LpcConnectionHelper.singleton.onConnectionLost(this.handleConnectionLost.bind(this)),
      LpcConnectionHelper.singleton.onMessage(this.handleMessage.bind(this))
    ];
  }

  start() {
    return this.isFirstInstance ? LpcConnectionHelper.singleton.start() : Promise.resolve();
  }

  end() {
    this.eventBus.unsubscribeAll();
    this.subscriptions.forEach(f => f());
  }

  getStatus() {
    return LpcConnectionHelper.singleton.getStatus();
  }

  getConnectionToken() {
    return LpcConnectionHelper.singleton.getConnectionToken();
  }

  onEnded(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.Ended, handler);
  }

  handleEnded() {
    this.eventBus.trigger(ConnectionHelperEvents.Ended, {});
  }

  onConnectionGain(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionGained, handler);
  }

  handleConnectionGain() {
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionGained, {});
  }

  onConnectionLost(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionLost, handler);
  }

  handleConnectionLost() {
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionLost, {});
  }

  onMessage(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.IncomingMessage, handler);
  }

  handleMessage(message) {
    // TODO: use correct contactId
    if (message.contactId === this.contactId) {
      this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, message);
    }
  }
}
LpcConnectionHelper.singleton = null;


class LPCConnectionHelperBase extends BaseConnectionHelper {
  constructor(connectionDetailsProvider, websocketManager) {
    super(connectionDetailsProvider);
    this.status = ConnectionHelperStatus.NeverStarted;
    this.eventBus = new EventBus();
    this.initWebsocketManager(websocketManager);
  }

  initWebsocketManager(websocketManager) {
    this.websocketManager = websocketManager || connect.WebSocketManager.create();
    this.websocketManager.subscribeTopics(["aws/chat"]);
    this.websocketManager.onMessage("aws/chat", this.handleMessage.bind(this));
    this.websocketManager.onConnectionGain(this.handleConnectionGain.bind(this));
    this.websocketManager.onConnectionLost(this.handleConnectionLost.bind(this));
    this.websocketManager.onInitFailure(this.handleEnded.bind(this));
    if (!websocketManager) {
      this.websocketManager.init(
        () => this.connectionDetailsProvider.fetchConnectionDetails()
          .then(connectionDetails => ({
            webSocketTransport: {
              url: connectionDetails.preSignedConnectionUrl
            }
          }))
      );
    }
  }

  start() {
    super.start();
    if (this.status === ConnectionHelperStatus.NeverStarted) {
      this.status = ConnectionHelperStatus.Starting;
    }
    return Promise.resolve();
  }

  onEnded(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.Ended, handler);
  }

  handleEnded() {
    this.status = ConnectionHelperStatus.Ended;
    this.eventBus.trigger(ConnectionHelperEvents.Ended, {});
  }

  onConnectionGain(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionGained, handler);
  }

  handleConnectionGain() {
    this.status = ConnectionHelperStatus.Connected;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionGained, {});
  }

  onConnectionLost(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionLost, handler);
  }

  handleConnectionLost() {
    this.status = ConnectionHelperStatus.ConnectionLost;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionLost, {});
  }

  onMessage(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.IncomingMessage, handler);
  }

  handleMessage(message) {
    this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, message);
  }
}

export default LpcConnectionHelper;
