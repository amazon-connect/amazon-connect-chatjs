import { EventBus } from "../eventbus";
import { LogManager } from "../../log";
import { 
  ConnectionHelperEvents,
  ConnectionHelperStatus
} from "./baseConnectionHelper";
import BaseConnectionHelper from "./baseConnectionHelper";
import WebSocketManager from "../../lib/amazon-connect-websocket-manager";
import { TRANSPORT_LIFETIME_IN_SECONDS } from "../../constants";

class LpcConnectionHelper extends BaseConnectionHelper {

  constructor(contactId, initialContactId, connectionDetailsProvider, websocketManager, logMetaData) {
    super(connectionDetailsProvider, logMetaData);
    this.cleanUpBaseInstance = !websocketManager;
    this.tryCleanup();
    if (!LpcConnectionHelper.baseInstance) {
      LpcConnectionHelper.baseInstance = new LPCConnectionHelperBase(connectionDetailsProvider, websocketManager, logMetaData);
    }
    this.contactId = contactId;
    this.initialContactId = initialContactId;
    this.status = null;
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
    this.status = ConnectionHelperStatus.Ended;
    this.tryCleanup();
  }

  tryCleanup() {
    if (LpcConnectionHelper.baseInstance && this.cleanUpBaseInstance) {
      LpcConnectionHelper.baseInstance.end();
      LpcConnectionHelper.baseInstance = null;
    }
  }

  getStatus() {
    return this.status || LpcConnectionHelper.baseInstance.getStatus();
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
    if (message.InitialContactId === this.initialContactId || message.ContactId === this.contactId) {
      this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, message);
    }
  }
}
LpcConnectionHelper.baseInstance = null;


class LPCConnectionHelperBase {
  constructor(connectionDetailsProvider, websocketManager, logMetaData) {
    this.status = ConnectionHelperStatus.NeverStarted;
    this.eventBus = new EventBus();
    this.logger = LogManager.getLogger({
      prefix: "ChatJS-LPCConnectionHelperBase",
      logMetaData
    });
    this.initWebsocketManager(websocketManager, connectionDetailsProvider);
  }

  initWebsocketManager(websocketManager, connectionDetailsProvider) {
    this.websocketManager = websocketManager || WebSocketManager.create();
    this.websocketManager.subscribeTopics(["aws/chat"]);
    this.subscriptions = [
      this.websocketManager.onMessage("aws/chat", this.handleMessage.bind(this)),
      this.websocketManager.onConnectionGain(this.handleConnectionGain.bind(this)),
      this.websocketManager.onConnectionLost(this.handleConnectionLost.bind(this)),
      this.websocketManager.onInitFailure(this.handleEnded.bind(this))
    ];
    this.logger.info("Initializing websocket manager.");
    if (!websocketManager) {
      this.websocketManager.init(
        () => connectionDetailsProvider.fetchConnectionDetails()
          .then(connectionDetails => {
            const details = {
              webSocketTransport: {
                url: connectionDetails.url,
                expiry: connectionDetails.expiry,
                transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS
              }
            }
            const logContent = {expiry: connectionDetails.expiry, transportLifeTimeInSeconds: TRANSPORT_LIFETIME_IN_SECONDS};
            this.logger.debug("Websocket manager initialized. Connection details:", logContent);
            return details;
          }
        ).catch(error => {
          this.logger.error("Initializing Websocket Manager failed:", error);
          throw error;
        })
      );
    }
  }

  end() {
    this.websocketManager.closeWebSocket();
    this.eventBus.unsubscribeAll();
    this.subscriptions.forEach(f => f());
    this.logger.info("Websocket closed. All event subscriptions are cleared.");
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
    this.logger.info("Websocket connection ended.");
  }

  onConnectionGain(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionGained, handler);
  }

  handleConnectionGain() {
    this.status = ConnectionHelperStatus.Connected;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionGained, {});
    this.logger.info("Websocket connection gained.");
  }

  onConnectionLost(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.ConnectionLost, handler);
  }

  handleConnectionLost() {
    this.status = ConnectionHelperStatus.ConnectionLost;
    this.eventBus.trigger(ConnectionHelperEvents.ConnectionLost, {});
    this.logger.info("Websocket connection lost.");
  }

  onMessage(handler) {
    return this.eventBus.subscribe(ConnectionHelperEvents.IncomingMessage, handler);
  }

  handleMessage(message) {
    let parsedMessage;
    try {
      parsedMessage = JSON.parse(message.content);
      this.eventBus.trigger(ConnectionHelperEvents.IncomingMessage, parsedMessage);
      this.logger.info("Websocket incoming message", {messageId: parsedMessage.Id, contentType: parsedMessage.ContentType});
    } catch (e) {
      this.logger.error("Wrong message format");
    }
  }

  getStatus() {
    return this.status;
  }
}

export default LpcConnectionHelper;