import { EventBus } from "../eventbus";
import { LogManager } from "../../log";
import { TRANSPORT_LIFETIME_IN_SECONDS } from "../../constants";
import { 
  ConnectionHelperEvents,
  ConnectionHelperStatus
} from "./baseConnectionHelper";
import BaseConnectionHelper from "./baseConnectionHelper";


class LpcConnectionHelper extends BaseConnectionHelper {

  constructor(contactId, connectionDetailsProvider, websocketManager) {
    super(connectionDetailsProvider);
    const cleanUpBaseInstance = LpcConnectionHelper.baseInstance && !websocketManager;
    if (cleanUpBaseInstance) {
      LpcConnectionHelper.baseInstance.end();
      LpcConnectionHelper.baseInstance = null;
    }
    if (!LpcConnectionHelper.baseInstance) {
      LpcConnectionHelper.baseInstance = new LPCConnectionHelperBase(connectionDetailsProvider, websocketManager);
    }
    this.contactId = contactId;
    this.eventBus = new EventBus();
    this.subscriptions = [
      LpcConnectionHelper.baseInstance.onEnded(this.handleEnded.bind(this)),
      LpcConnectionHelper.baseInstance.onConnectionGain(this.handleConnectionGain.bind(this)),
      LpcConnectionHelper.baseInstance.onConnectionLost(this.handleConnectionLost.bind(this)),
      LpcConnectionHelper.baseInstance.onMessage(this.handleMessage.bind(this))
    ];
  }

  start() {
    super.start();
    return LpcConnectionHelper.baseInstance.start();
  }

  end() {
    super.end();
    this.eventBus.unsubscribeAll();
    this.subscriptions.forEach(f => f());
  }

  getStatus() {
    return LpcConnectionHelper.baseInstance.getStatus();
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
    if (message.InitialContactId === this.contactId) {
      this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, message);
    }
  }
}
LpcConnectionHelper.baseInstance = null;


class LPCConnectionHelperBase {
  constructor(connectionDetailsProvider, websocketManager) {
    this.status = ConnectionHelperStatus.NeverStarted;
    this.eventBus = new EventBus();
    this.logger = LogManager.getLogger({
      prefix: "LPC WebSockets: "
    });
    this.initWebsocketManager(websocketManager, connectionDetailsProvider);
  }

  initWebsocketManager(websocketManager, connectionDetailsProvider) {
    this.websocketManager = websocketManager || connect.WebSocketManager.create();
    this.websocketManager.subscribeTopics(["aws/chat"]);
    this.subscriptions = [
      this.websocketManager.onMessage("aws/chat", this.handleMessage.bind(this)),
      this.websocketManager.onConnectionGain(this.handleConnectionGain.bind(this)),
      this.websocketManager.onConnectionLost(this.handleConnectionLost.bind(this)),
      this.websocketManager.onInitFailure(this.handleEnded.bind(this))
    ];
    if (!websocketManager) {
      this.websocketManager.init(
        () => connectionDetailsProvider.fetchConnectionDetails()
          .then(connectionDetails => ({
            webSocketTransport: {
              url: connectionDetails.preSignedConnectionUrl,
              transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS
            }
          }))
      );
    }
  }

  end() {
    this.eventBus.unsubscribeAll();
    this.subscriptions.forEach(f => f());
  }

  start() {
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
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.content);
      this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, parsedMessage);
    } catch (e) {
      this.logger.error(`Wrong message format: `, message);
    }
  }
}

export default LpcConnectionHelper;
