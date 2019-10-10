import {
  PERSISTENCE,
  VISIBILITY,
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  CONTENT_TYPE,
  SESSION_TYPES
} from "../constants";
import Utils from "../utils";
import { ChatController } from "./chatController";
import connectionHelperProvider from "./connectionHelpers/connectionHelperProvider";
import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";

jest.mock("./connectionHelpers/connectionHelperProvider");

describe("ChatController", () => {

  const chatDetails = {
    contactId: "id",
    initialContactId: "id",
    connectionDetails: {},
    participantId: "pid",
    participantToken: "token"
  };
  let chatClient = {
    createConnectionDetails: () => {}
  };
  const websocketManager = {};
  let startResponse;
  let endResponse;

  function getChatController() {
    return new ChatController({
      sessionType: SESSION_TYPES.AGENT,
      chatDetails: chatDetails,
      chatClient: chatClient,
      websocketManager: websocketManager
    });
  }

  beforeEach(() => {
    const messageHandlers = [];
    startResponse = Promise.resolve();
    endResponse = Promise.resolve();
    connectionHelperProvider.get.mockResolvedValue({
      onEnded: () => {},
      onConnectionLost: () => {},
      onConnectionGain: () => {},
      onMessage: (handler) => {
        messageHandlers.push(handler);
      },
      start: () => startResponse,
      end: () => endResponse,
      getStatus: () => ConnectionHelperStatus.Connected,
      getConnectionToken: () => "token",
      $simulateMessage: (message) => {
        messageHandlers.forEach(f => f({
          Data: {
            Type: "INCOMING_MESSAGE",
            Message: message
          }
        }));
      },
      $simulateTyping: () => {
        messageHandlers.forEach(f => f({
          Data: {
            Type: "TYPING"
          }
        }));
      }
    });
    chatClient = {
      sendMessage: jest.fn(() => Promise.resolve({ testField: "test" })),
      sendEvent: jest.fn(() => Promise.resolve({ testField: "test" })),
      getTranscript: jest.fn(() => Promise.resolve({ testField: "test" })),
      disconnectChat: jest.fn(() => Promise.resolve({ testField: "test" }))
    };
  });

  test("Connection gets established successfully", async () => {
    const chatController = getChatController();
    const connectionEstablishedHandler = jest.fn();
    chatController.subscribe(CHAT_EVENTS.CONNECTION_ESTABLISHED, connectionEstablishedHandler);
    await chatController.connect();
    await Utils.delay(1);
    expect(connectionEstablishedHandler).toHaveBeenCalledTimes(1);
  });

  test(".connect fails when connectionHelper can't establish connection", async () => {
    startResponse = Promise.reject();
    const chatController = getChatController();
    try {
      await chatController.connect();
    } catch (e) {
      expect(e.connectSuccess).toBe(false);
    }
  });

  test("sendMessage works as expected", async () => {
    const args = {
      metadata: "metadata",
      message: "message"
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.sendMessage(args);
    expect(chatClient.sendMessage).toHaveBeenCalledWith("token", "message", CONTENT_TYPE.textPlain);
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
  });
  
  test("sendEvent works as expected", async () => {
    const args = {
      metadata: "metadata",
      eventType: "event",
      messageIds: [],
      contentType: "some_event"
    };
    const chatController = getChatController();
    await chatController.connect();
    console.log(args.contentType);
    const response = await chatController.sendEvent(args);
    expect(chatClient.sendEvent).toHaveBeenCalledWith("token", "some_event", "", "event", [], VISIBILITY.ALL, PERSISTENCE.PERSISTED);
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
  });
  
  test("getTranscript works as expected", async () => {
    var args = {
      metadata: "metadata"
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.getTranscript(args);
    expect(chatClient.getTranscript).toHaveBeenCalledWith("token", {
      ContactId: "id",
      StartPosition: {},
      ScanDirection: TRANSCRIPT_DEFAULT_PARAMS.SCAN_DIRECTION,
      SortOrder: TRANSCRIPT_DEFAULT_PARAMS.SORT_KEY,
      MaxResults: TRANSCRIPT_DEFAULT_PARAMS.MAX_RESULTS
    });
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
  });
  
  test("disconnect works as expected", async () => {
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.disconnectParticipant();
    expect(chatClient.disconnectChat).toHaveBeenCalledWith("token");
    expect(response.testField).toBe("test");
  });
  
  test("incoming message receive works as expected", async () => {
    const chatController = getChatController();
    await chatController.connect();
    const messageHandler = jest.fn();
    chatController.subscribe(CHAT_EVENTS.INCOMING_MESSAGE, messageHandler);
    chatController.connectionHelper.$simulateMessage("message");
    await Utils.delay(1);
    expect(messageHandler).toHaveBeenCalledTimes(1);
  });
  
  test("incoming typing receive works as expected", async () => {
    const chatController = getChatController();
    await chatController.connect();
    const messageHandler = jest.fn();
    chatController.subscribe(CHAT_EVENTS.INCOMING_TYPING, messageHandler);
    chatController.connectionHelper.$simulateTyping();
    await Utils.delay(1);
    expect(messageHandler).toHaveBeenCalledTimes(1);
  });
});
