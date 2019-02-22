import { MockMqttConnection } from "./testUtils";
import {
  ConnectionHelperStatus,
  SoloChatConnectionMqttHelper,
  ConnectionHelperEvents
} from "../../src/core/connectionHelper";
import { ChatSessionObject } from "../../src/core/chatSession";
import { MqttEvents } from "../../src/core/connectionManager";

const callbackProxy = {
  getProxy: () => {
    return (eventType, eventData) =>
      callbackProxy.actualCallback(eventType, eventData);
  },
  actualCallback: (eventType, eventData) => {
    var message = "CALLBACK NOT SET FOR CONNECTION HELPER";
    console.log(message);
    throw message;
  }
};

const _createConnectonHelper = mqttConnectionProvider => {
  var args = {};
  args.contactId = "contactId";
  args.connectionDetails = {
    preSignedUrl: "testPreSignedUrl",
    connectionId: "testConnectionId"
  };
  args.mqttConnectionProvider = mqttConnectionProvider;
  args.callback = callbackProxy.getProxy();
  return new SoloChatConnectionMqttHelper(args);
};

var setup = {};

beforeEach(() => {
  ChatSessionObject.setGlobalConfig({
    loggerConfig: {
      debug: true,
      level: 1
    },
    region: "us-east-1"
  });
  var mqttConnection = new MockMqttConnection();
  var mqttConnectionProvider = mqttcallback => {
    mqttConnection.callback = mqttcallback;
    return mqttConnection;
  };
  setup.connectionHelper = _createConnectonHelper(mqttConnectionProvider);
  setup.mqttConnection = mqttConnection;
});

test("start and end works as expected", () => {
  return setup.connectionHelper.start().then(function() {
    expect(setup.connectionHelper.getStatus()).toEqual(
      ConnectionHelperStatus.Connected
    );
    setup.connectionHelper.end();
    expect(setup.connectionHelper.getStatus()).toEqual(
      ConnectionHelperStatus.Ended
    );
  });
});

test("start fails when subscribe fails", () => {
  expect.assertions(1);
  setup.mqttConnection.subscribe = () => {
    return new Promise((resolve, reject) => {
      reject();
    });
  };
  return setup.connectionHelper.start().then(
    function() {},
    function(error) {
      expect(error.connectSuccess).toEqual(false);
    }
  );
});

test("MQTT message propagated correctly", done => {
  var testData = { key: "value" };
  callbackProxy.actualCallback = (eventType, eventData) => {
    expect(eventType).toEqual(ConnectionHelperEvents.IncomingMessage);
    expect(eventData).toEqual(testData);
    done();
  };
  setup.connectionHelper
    .start()
    .then(function() {
      expect(setup.connectionHelper.getStatus()).toEqual(
        ConnectionHelperStatus.Connected
      );
    })
    .then(function() {
      setup.mqttConnection.scheduleEvent(MqttEvents.MESSAGE, testData, 5);
    });
});

test("MQTT disconnect event ends connectionHelper", done => {
  var testData = { key: "value" };
  callbackProxy.actualCallback = (eventType, eventData) => {
    expect(eventType).toEqual(ConnectionHelperEvents.Ended);
    expect(eventData).toEqual(testData);
    expect(setup.connectionHelper.getStatus()).toEqual(
      ConnectionHelperStatus.Ended
    );
    done();
  };
  setup.connectionHelper
    .start()
    .then(function() {
      expect(setup.connectionHelper.getStatus()).toEqual(
        ConnectionHelperStatus.Connected
      );
    })
    .then(function() {
      setup.mqttConnection.scheduleEvent(MqttEvents.DISCONNECTED, testData, 5);
    });
});
