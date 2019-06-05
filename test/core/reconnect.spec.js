import { PersistentConnectionAndChatServiceController, NetworkLinkStatus } from "../../src/core/chatController";
import { ChatServiceArgsValidator } from "../../src/core/chatArgsValidator";
import { EventConstructor } from "../../src/core/eventConstructor";
import {
  MockChatClient,
  MockConnectionHelper,
  MockEventBus
} from "./testUtils";
import { ChatSessionObject } from "../../src/core/chatSession";
import { CHAT_EVENTS } from "../../src/constants";

var CHAT_DETAILS = {
  connectionDetails: {
    ConnectionId: "021bb2f0-657d-4d08-a9a5-4caa543a966d",
    connectionToken: "AQIDAHX",
    PreSignedConnectionUrl:
      "wss://a2sg9pz864ik5-ats.iot.us-west-2.amazonaws.com/mqtt"
  },
  initialContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  contactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  participantId: "5c2c827f-18ca-4b8a-869e-acefe4a74dc4",
  participantToken: ""
};

const _createController = (createConnectionHelperProvider, reconnectConfig, participantToken) => {
  var args = {};
  args.argsValidator = new ChatServiceArgsValidator();
  args.chatEventConstructor = new EventConstructor();
  args.chatDetails = Object.assign({}, CHAT_DETAILS, {participantToken: participantToken});
  args.chatClient = MockChatClient;
  args.hasConnectionDetails = true;
  var MockChatControllerFactory = {
    createConnectionHelperProvider: createConnectionHelperProvider
  };
  args.chatControllerFactory = MockChatControllerFactory;
  args.pubsub = new MockEventBus();
  args.argsValidator = new ChatServiceArgsValidator();
  args.argsValidator = new ChatServiceArgsValidator();
  args.reconnectConfig = reconnectConfig;
  return new PersistentConnectionAndChatServiceController(args);
};


describe("Reconnect", () => {

  let canConnect = true;
  let controller = null;
  let connectionHelper = null;
  let reconnect = true;
  let participantToken = 'token';
  let reconnectConfig = {
    interval: 1000,
    maxRetries: 3
  };

  beforeEach(() => {
    canConnect = true;
    reconnect = true;
    participantToken = 'token';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function advanceIteration() {
    await Promise.resolve();
    jest.advanceTimersByTime(reconnectConfig.interval);
    await Promise.resolve();
  }

  function setup() {
    ChatSessionObject.setGlobalConfig({
      loggerConfig: {
        debug: true,
        level: 1
      },
      region: "us-east-1",
      reconnect: reconnect
    });
    var createConnectionHelperProvider = jest.fn(
      () => {
        return callback => {
          connectionHelper = new MockConnectionHelper(callback, canConnect);
          return connectionHelper;
        };
      }
    );
    controller = _createController(createConnectionHelperProvider, reconnectConfig, participantToken);
  }

  test("succeeding connection results in resolving promise and status=Established", async () => {
    setup();
    await controller.connect();
    expect(controller.getConnectionStatus()).toBe(NetworkLinkStatus.Established);
  });

  test("failing connection results in rejected promise and status=Broken", async () => {
    canConnect = false;
    setup();
    try {
      await controller.connect();
    } catch(e) {
      expect(controller.getConnectionStatus()).toBe(NetworkLinkStatus.Broken);
    }
  });

  test("ending connection results in status=Broken", async () => {
    setup();
    await controller.connect();
    connectionHelper.end({ reason: {errorCode: 1} });
    expect(controller.getConnectionStatus()).toBe(NetworkLinkStatus.Broken);
  });

  test("ending connection initiated reconnect routine", async () => {
    setup();
    controller._initiateReconnect = jest.fn();
    await controller.connect();
    connectionHelper.end({ reason: {errorCode: 1} });
    expect(controller._initiateReconnect).toHaveBeenCalled();
  });

  test("ending connection does not initiate reconnect routine if participantToken is missing", async () => {
    participantToken = null;
    setup();
    controller._initiateReconnect = jest.fn();
    await controller.connect();
    connectionHelper.end({ reason: {errorCode: 1} });
    expect(controller._initiateReconnect).not.toHaveBeenCalled();
  });

  test("ending connection reconnects successfully", async (done) => {
    setup();
    await controller.connect();
    controller.subscribe(CHAT_EVENTS.CONNECTION_ESTABLISHED, () => {
      expect(controller.getConnectionStatus()).toBe(NetworkLinkStatus.Established);
      done();
    });
    connectionHelper.end({ reason: {errorCode: 1} });
  });

  test("honors maxReconnectAttempts", async () => {
    setup();
    await controller.connect();
    controller._connect = jest.fn(() => Promise.reject());
    connectionHelper.end({ reason: {errorCode: 1} });
    for (let i = 0; i < reconnectConfig.maxRetries; i++) {
      expect(controller._connect).toHaveBeenCalledTimes(i + 1);
      await advanceIteration();
    }
    expect(controller._connect).toHaveBeenCalledTimes(reconnectConfig.maxRetries);
  });

  test("stops attempting to reconnect when connection was successful", async () => {
    let canConnect = false;
    setup();
    await controller.connect();
    controller._connect = jest.fn(() => canConnect ? Promise.resolve() : Promise.reject());
    connectionHelper.end({ reason: {errorCode: 1} });
    expect(controller._connect).toHaveBeenCalledTimes(1);
    canConnect = true;
    await advanceIteration();
    expect(controller._connect).toHaveBeenCalledTimes(2);
    await advanceIteration();
    expect(controller._connect).toHaveBeenCalledTimes(2);
  });

  test("successful reconnect results in status=Established", async () => {
    setup();
    await controller.connect();
    canConnect = false;
    connectionHelper.end({ reason: {errorCode: 1} });
    canConnect = true;
    await advanceIteration();
    expect(controller.getConnectionStatus()).toBe(NetworkLinkStatus.Established);
  });
});
