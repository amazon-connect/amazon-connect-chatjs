import LpcConnectionHelper from "./LpcConnectionHelper";


describe("LpcConnectionHelper", () => {

  let connectionDetailsProvider = {
    fetchConnectionDetails: () => {}
  };
  let websocketManager;

  function initWebsocketManager() {
    const messageHandlers = [];
    const connectionLostHandlers = [];
    const connectionGainHandlers = [];
    const endedHandlers = [];
    const refreshHandlers = [];

    websocketManager = {
      subscribeTopics: jest.fn((topics) => {}),
      onMessage: jest.fn((topic, handler) => {
        messageHandlers.push(handler);
      }),
      onConnectionGain: jest.fn((handler) => {
        connectionGainHandlers.push(handler);
      }),
      onConnectionLost: jest.fn((handler) => {
        connectionLostHandlers.push(handler);
      }),
      onInitFailure: jest.fn((handler) => {
        endedHandlers.push(handler);
      }),
      init: jest.fn((dataProvider) => {
        refreshHandlers.push(dataProvider);
      }),
      $simulateMessage(message) {
        messageHandlers.forEach(f => f(message));
      },
      $simulateConnectionLost() {
        connectionLostHandlers.forEach(f => f());
      },
      $simulateConnectionGain() {
        connectionGainHandlers.forEach(f => f());
      },
      $simulateEnded() {
        endedHandlers.forEach(f => f());
      },
      $simulateRefresh() {
        refreshHandlers.forEach(f => f());
      }
    };
    return websocketManager;
  }

  beforeEach(() => {
    connectionDetailsProvider.fetchConnectionDetails = jest.fn(() => Promise.resolve({
      preSignedConnectionUrl: "url"
    }));
    LpcConnectionHelper.baseInstance = null;
    initWebsocketManager();
    global.connect = global.connect || {};
    global.connect.WebSocketManager = { create: initWebsocketManager };
  });

  function getLpcConnectionHelper(contactId) {
    return new LpcConnectionHelper(contactId, connectionDetailsProvider, websocketManager);
  }

  describe("with provided websocketManager", () => {
    test("call relevant methods on provided websocketManager during initialization", () => {
      getLpcConnectionHelper("id").start();
      expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
      expect(websocketManager.subscribeTopics).toHaveBeenCalledWith(["aws/chat"]);
      expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
      expect(websocketManager.onMessage).toHaveBeenCalledWith("aws/chat", expect.any(Function));
      expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
      expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
    });
  
    // test("websocket manager will only be initialized once", () => {
    //   getLpcConnectionHelper("id1").start();
    //   getLpcConnectionHelper("id2").start();
    //   expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
    // });

    test("onConnectionLost handler is called", () => {
      const onConnectionLostHandler1 = jest.fn();
      const onConnectionLostHandler2 = jest.fn();
      getLpcConnectionHelper("id1").onConnectionLost(onConnectionLostHandler1);
      getLpcConnectionHelper("id2").onConnectionLost(onConnectionLostHandler2);
      websocketManager.$simulateConnectionLost();
      expect(onConnectionLostHandler1).toHaveBeenCalledTimes(1);
      expect(onConnectionLostHandler2).toHaveBeenCalledTimes(1);
    });

    test("onConnectionGain handler is called", () => {
      const onConnectionGainHandler1 = jest.fn();
      const onConnectionGainHandler2 = jest.fn();
      getLpcConnectionHelper("id1").onConnectionGain(onConnectionGainHandler1);
      getLpcConnectionHelper("id2").onConnectionGain(onConnectionGainHandler2);
      websocketManager.$simulateConnectionGain();
      expect(onConnectionGainHandler1).toHaveBeenCalledTimes(1);
      expect(onConnectionGainHandler2).toHaveBeenCalledTimes(1);
    });

    test("onMessage handler is called", () => {
      const onMessageHandler1 = jest.fn();
      const onMessageHandler2 = jest.fn();
      getLpcConnectionHelper("id1").onMessage(onMessageHandler1);
      getLpcConnectionHelper("id2").onMessage(onMessageHandler2);
      websocketManager.$simulateMessage({ content: JSON.stringify({ InitialContactId: "id1" }) });
      websocketManager.$simulateMessage({ content: JSON.stringify({ InitialContactId: "id2" }) });
      expect(onMessageHandler1).toHaveBeenCalledTimes(1);
      expect(onMessageHandler1).toHaveBeenCalledWith({ InitialContactId: "id1" }, expect.anything(), expect.anything());
      expect(onMessageHandler2).toHaveBeenCalledTimes(1);
      expect(onMessageHandler2).toHaveBeenCalledWith({ InitialContactId: "id2" }, expect.anything(), expect.anything());
    });
  });

  describe("without provided websocketManager", () => {
    test("call relevant methods on new websocketManager during initialization", () => {
      websocketManager = null;
      getLpcConnectionHelper("id").start();
      expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
      expect(websocketManager.subscribeTopics).toHaveBeenCalledWith(["aws/chat"]);
      expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
      expect(websocketManager.onMessage).toHaveBeenCalledWith("aws/chat", expect.any(Function));
      expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
      expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
      expect(websocketManager.init).toHaveBeenCalledTimes(1);
    });
  
    // test("websocket manager will only be initialized once", () => {
    //   websocketManager = null;
    //   getLpcConnectionHelper("id1").start();
    //   getLpcConnectionHelper("id2").start();
    //   expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
    //   expect(websocketManager.init).toHaveBeenCalledTimes(1);
    // });

    test("onEnded handler is called", () => {
      websocketManager = null;
      const onEndedHandler1 = jest.fn();
      const onEndedHandler2 = jest.fn();
      getLpcConnectionHelper("id1").onEnded(onEndedHandler1);
      getLpcConnectionHelper("id2").onEnded(onEndedHandler2);
      websocketManager.$simulateEnded();
      expect(onEndedHandler1).toHaveBeenCalledTimes(1);
      expect(onEndedHandler2).toHaveBeenCalledTimes(1);
    });

    test("onRefresh handler is called", () => {
      websocketManager = null;
      getLpcConnectionHelper("id");
      websocketManager.$simulateRefresh();
      expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
    });
  });
});
