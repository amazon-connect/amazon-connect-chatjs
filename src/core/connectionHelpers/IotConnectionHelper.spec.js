import '../../../test/polyfills';
import { GlobalConfig } from "../../globalConfig";
import { PahoMqttClient, MqttEvents } from "../../client/pahoMqttClient";


import IotConnectionHelper from "./IotConnectionHelper";
import { 
  ConnectionHelperStatus
} from "./baseConnectionHelper";

jest.mock("../../globalConfig", () => {
  return {
    __esModule: true,
    GlobalConfig: {
      reconnect: true
    }
  };
});

jest.mock("../../client/pahoMqttClient", () => {
  return {
    __esModule: true,
    MqttEvents: {
      MESSAGE: "Message",
      DISCONNECTED: "Disconnected"
    },
    PahoMqttClient: (args) => ({
      connect: () => {
        return Promise.resolve();
      },
      disconnect: () => {
        args.callback("Disconnected", { reason: { errorCode: 0 }});
      },
      subscribe: () => {
        return Promise.resolve();
      },
      $simulateConnectionLost: () => {
        args.callback("Disconnected", { reason: { errorCode: 1 }});
      },
      $simulateMessage: (message) => {
        args.callback("Message", { payloadString: message });
      }
    })
  };
});

describe("IotConnectionHelper", () => {
  
  let connectionDetailsProvider = {
    fetchConnectionDetails: () => {}
  };
  let reconnectConfig = {};
  let preSignedConnectionUrl;
  let connectionId;

  beforeEach(() => {
    preSignedConnectionUrl = "url";
    connectionId = "id";
    connectionDetailsProvider.fetchConnectionDetails = jest.fn(() => {
      connectionDetailsProvider.connectionDetails = {
        connectionId: connectionId
      };
      return Promise.resolve({
        preSignedConnectionUrl: preSignedConnectionUrl,
        connectionId: connectionId
      });
    });
    reconnectConfig = {
      interval: 1,
      maxRetries: 1
    };
  });

  function getIotConnectionHelper(contactId) {
    return new IotConnectionHelper(contactId, connectionDetailsProvider, reconnectConfig);
  }

  test("Can successfully connect", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    await iotConnectionHelper.start();
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Connected);
  });

  test("Can successfully end", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    const disconnectHandler = jest.fn();
    await iotConnectionHelper.start();
    iotConnectionHelper.onEnded(disconnectHandler);
    iotConnectionHelper.end();
    expect(disconnectHandler).toHaveBeenCalledTimes(1);
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
  });

  test("Can receive a message", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    const messageHandler = jest.fn();
    await iotConnectionHelper.start();
    iotConnectionHelper.onMessage(messageHandler);
    iotConnectionHelper.iotConnection.$simulateMessage(JSON.stringify({ Data: "message" }));
    expect(messageHandler).toHaveBeenCalledTimes(1);
    expect(messageHandler).toHaveBeenCalledWith({ Data: "message" }, expect.anything(), expect.anything());
  });

  test("Connect fails on connect error (no retries)", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    iotConnectionHelper._connect = jest.fn(() => Promise.reject());
    const handler = jest.fn();
    iotConnectionHelper.onEnded(handler);
    try {
      await iotConnectionHelper.start();
    } catch (e) {
      expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(iotConnectionHelper._connect).toHaveBeenCalledTimes(1);
    }
  }); 

  test("Connect fails on connect error (with retries)", async () => {
    reconnectConfig.maxRetries = 3;
    const iotConnectionHelper = getIotConnectionHelper();
    iotConnectionHelper._connect = jest.fn(() => Promise.reject());
    const handler = jest.fn();
    iotConnectionHelper.onEnded(handler);
    try {
      await iotConnectionHelper.start();
    } catch (e) {
      expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(iotConnectionHelper._connect).toHaveBeenCalledTimes(reconnectConfig.maxRetries);
    }
  }); 

  test("Connect fails on subscribe error (no retries)", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    iotConnectionHelper._subscribe = jest.fn((resolve, reject) => reject());
    const handler = jest.fn();
    iotConnectionHelper.onEnded(handler);
    try {
      await iotConnectionHelper.start();
    } catch (e) {
      expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
      expect(handler).toHaveBeenCalledTimes(1);
    }
  }); 

  test("Broken connection triggers reconnect", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    await iotConnectionHelper.start();
    iotConnectionHelper.iotConnection.$simulateConnectionLost();
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.ConnectionLost);
    await iotConnectionHelper._initiateConnectPromise;
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Connected);
  });

  test("Broken connection with no ability to reconnect", async () => {
    reconnectConfig.maxRetries = 3;
    const iotConnectionHelper = getIotConnectionHelper();
    await iotConnectionHelper.start();
    iotConnectionHelper._connect = jest.fn(() => Promise.reject());
    iotConnectionHelper.iotConnection.$simulateConnectionLost();
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.ConnectionLost);
    try {
      await iotConnectionHelper._initiateConnectPromise;
    } catch (e) {
      expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
    }
  });

  test("Intentional disconnect does not triggers reconnect", async () => {
    const iotConnectionHelper = getIotConnectionHelper();
    await iotConnectionHelper.start();
    iotConnectionHelper.end();
    expect(iotConnectionHelper.status).toBe(ConnectionHelperStatus.Ended);
    expect(iotConnectionHelper._initiateConnectPromise).toBeNull();
  });

  test("Honors maxReconnectAttempts", async () => {
    reconnectConfig.maxRetries = 3;
    const iotConnectionHelper = getIotConnectionHelper();
    iotConnectionHelper._connect = jest.fn(() => Promise.reject("error"));
    try {
      await iotConnectionHelper.start();
    } catch (e) {
      expect(e).toBe("error");
      expect(iotConnectionHelper._connect).toHaveBeenCalledTimes(reconnectConfig.maxRetries);
    }
  });

  test("Reconnects eventually on success after after several failures", async () => {
    reconnectConfig.maxRetries = 3;
    const iotConnectionHelper = getIotConnectionHelper();
    iotConnectionHelper._connect = jest.fn((function () {
      let c = 0;
      return () => {
        return c++ < 2 ? Promise.reject() : Promise.resolve();
      };
    } ()));
    await iotConnectionHelper.start();
    expect(iotConnectionHelper._connect).toHaveBeenCalledTimes(3);
  });
});
