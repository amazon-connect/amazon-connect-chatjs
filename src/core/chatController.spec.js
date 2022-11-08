import {
  CHAT_EVENTS,
  TRANSCRIPT_DEFAULT_PARAMS,
  CONTENT_TYPE,
  SESSION_TYPES,
  MESSAGE,
  EVENT,
  CSM_CATEGORY,
  ACPS_METHODS
} from "../constants";
import Utils from "../utils";
import { ChatController } from "./chatController";
import { ConnectionHelperStatus } from "./connectionHelpers/baseConnectionHelper";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import connectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";
import { csmService } from "../service/csmService";

jest.mock("./connectionHelpers/LpcConnectionHelper");
jest.mock("./connectionHelpers/connectionDetailsProvider");
jest.mock("../service/csmService");

describe("ChatController", () => {

  const chatDetails = {
    contactId: "id",
    initialContactId: "id",
    connectionDetails: {},
    participantId: "pid",
    participantToken: "token"
  };
  let chatClient = {
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
    jest.resetAllMocks();
    const messageHandlers = [];
    const onEndedHandlers = [];
    startResponse = Promise.resolve();
    endResponse = Promise.resolve();
    connectionDetailsProvider.mockImplementation(() => {
      return {
        fetchConnectionDetails: () => {
          return Promise.resolve({
            url: "url",
            expiry: "expiry"
          })
        },
        fetchConnectionToken: () => {
          return Promise.resolve("token");
        }
      };
    });
    LpcConnectionHelper.mockImplementation(() => {
      return {
        onEnded: (handlers) => {
          onEndedHandlers.push(handlers);
        },
        onConnectionLost: () => { },
        onConnectionGain: () => { },
        onMessage: (handler) => {
          messageHandlers.push(handler);
        },
        start: () => startResponse,
        end: () => endResponse,
        getStatus: () => ConnectionHelperStatus.Connected,
        getConnectionToken: () => "token",
        $simulateMessage: (message) => {
          messageHandlers.forEach(f => f({
            Type: MESSAGE,
            ContentType: CONTENT_TYPE.textPlain,
            Message: message
          }));
        },
        $simulateTyping: () => {
          messageHandlers.forEach(f => f({
            Type: EVENT,
            ContentType: CONTENT_TYPE.typing
          }));
        },
        $simulateEnding: () => {
          messageHandlers.forEach(f => f({
            Type: EVENT,
            ContentType: CONTENT_TYPE.chatEnded
          }));
        },
        $simulateConnectionEnding: () => {
          onEndedHandlers.forEach(f => f({
            Type: EVENT,
            ContentType: CONTENT_TYPE.chatEnded
          }));
        }
      };
    });
    chatClient = {
      sendMessage: jest.fn(() => Promise.resolve({ testField: "test" })),
      sendEvent: jest.fn(() => Promise.resolve({ testField: "test" })),
      getTranscript: jest.fn(() => Promise.resolve({ testField: "test" })),
      disconnectParticipant: jest.fn(() => Promise.resolve({ testField: "test" })),
      sendAttachment: jest.fn(() => Promise.resolve({ testField: "test" })),
      downloadAttachment: jest.fn(() => Promise.resolve({ testField: "test" })),
    };
    jest.spyOn(csmService, 'addLatencyMetricWithStartTime').mockImplementation(() => { });
    jest.spyOn(csmService, 'addCountAndErrorMetric').mockImplementation(() => { });
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
    let flag = false;
    try {
      await chatController.connect();
    } catch (e) {
      flag = true;
      expect(e.connectSuccess).toBe(false);
    }
    expect(flag).toEqual(true);
  });

  test("sendMessage works as expected", async () => {
    const args = {
      metadata: "metadata",
      message: "message",
      contentType: CONTENT_TYPE.textPlain
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.sendMessage(args);
    expect(chatClient.sendMessage).toHaveBeenCalledWith("token", "message", CONTENT_TYPE.textPlain);
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_MESSAGE, CSM_CATEGORY.API, false, [{ name: "ContentType", value: CONTENT_TYPE.textPlain }]);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_MESSAGE, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: CONTENT_TYPE.textPlain }]);
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
  });

  test("sendMessage throws an error", async () => {
    const args = {
      metadata: "metadata",
      message: "message",
      contentType: CONTENT_TYPE.textPlain
    };
    const chatController = getChatController();
    await chatController.connect();
    chatClient.sendMessage = jest.fn(() => Promise.reject({}));
    try {
      await chatController.sendMessage(args);
      expect(false).toEqual(true);
    } catch (e) {
      expect(e.metadata).toEqual("metadata");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_MESSAGE, CSM_CATEGORY.API, true, [{ name: "ContentType", value: CONTENT_TYPE.textPlain }]);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_MESSAGE, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: CONTENT_TYPE.textPlain }]);
    }
  });

  test("sendEvent works as expected", async () => {
    const args = {
      metadata: "metadata",
      contentType: CONTENT_TYPE.participantJoined
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.sendEvent(args);
    expect(chatClient.sendEvent).toHaveBeenCalledWith("token", CONTENT_TYPE.participantJoined, null);
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_EVENT, CSM_CATEGORY.API, false, [{ name: "ContentType", value: CONTENT_TYPE.participantJoined }]);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_EVENT, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: CONTENT_TYPE.participantJoined }]);
  });

  test("sendEvent throws an error", async () => {
    const args = {
      metadata: "metadata",
      contentType: CONTENT_TYPE.participantJoined
    };
    const chatController = getChatController();
    await chatController.connect();
    chatClient.sendEvent = jest.fn(() => Promise.reject({}));
    try {
      await chatController.sendEvent(args);
      expect(false).toEqual(true);
    } catch (e) {
      expect(e.metadata).toEqual("metadata");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_EVENT, CSM_CATEGORY.API, true, [{ name: "ContentType", value: CONTENT_TYPE.participantJoined }]);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_EVENT, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: CONTENT_TYPE.participantJoined }]);
    }
  });

  test("sendAttachment works as expected", async () => {
    const args = {
      metadata: "metadata",
      attachment: {
        type: "attachment-type",
      },
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.sendAttachment(args);
    expect(chatClient.sendAttachment).toHaveBeenCalledWith("token", args.attachment, "metadata");
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_ATTACHMENT, CSM_CATEGORY.API, false, [{ name: "ContentType", value: "attachment-type" }]);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_ATTACHMENT, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: "attachment-type" }]);
  });

  test("sendAttachment throws an error", async () => {
    const args = {
      metadata: "metadata",
      attachment: {
        type: "attachment-type",
      },
    };
    const chatController = getChatController();
    await chatController.connect();
    chatClient.sendAttachment = jest.fn(() => Promise.reject({}));
    try {
      await chatController.sendAttachment(args);
      expect(false).toEqual(true);
    } catch (e) {
      expect(e.metadata).toEqual("metadata");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.SEND_ATTACHMENT, CSM_CATEGORY.API, true, [{ name: "ContentType", value: "attachment-type" }]);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.SEND_ATTACHMENT, expect.anything(), CSM_CATEGORY.API, [{ name: "ContentType", value: "attachment-type" }]);
    }
  });

  test("downloadAttachment works as expected", async () => {
    const args = {
      metadata: "metadata",
      attachmentId: "attachmentId",
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.downloadAttachment(args);
    expect(chatClient.downloadAttachment).toHaveBeenCalledWith("token", "attachmentId");
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.DOWNLOAD_ATTACHMENT, CSM_CATEGORY.API, false, []);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.DOWNLOAD_ATTACHMENT, expect.anything(), CSM_CATEGORY.API, []);
  });

  test("downloadAttachment throws an error", async () => {
    const args = {
      metadata: "metadata",
      attachmentId: "attachmentId",
    };
    const chatController = getChatController();
    await chatController.connect();
    chatClient.downloadAttachment = jest.fn(() => Promise.reject({}));
    try {
      await chatController.downloadAttachment(args);
      expect(false).toEqual(true);
    } catch (e) {
      expect(e.metadata).toEqual("metadata");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.DOWNLOAD_ATTACHMENT, CSM_CATEGORY.API, true, []);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.DOWNLOAD_ATTACHMENT, expect.anything(), CSM_CATEGORY.API, []);
    }
  });

  test("getTranscript works as expected", async () => {
    var args = {
      metadata: "metadata"
    };
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.getTranscript(args);
    expect(chatClient.getTranscript).toHaveBeenCalledWith("token", {
      startPosition: {},
      scanDirection: TRANSCRIPT_DEFAULT_PARAMS.SCAN_DIRECTION,
      sortOrder: TRANSCRIPT_DEFAULT_PARAMS.SORT_ORDER,
      maxResults: TRANSCRIPT_DEFAULT_PARAMS.MAX_RESULTS
    });
    expect(response.metadata).toBe("metadata");
    expect(response.testField).toBe("test");
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.GET_TRANSCRIPT, CSM_CATEGORY.API, false, []);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.GET_TRANSCRIPT, expect.anything(), CSM_CATEGORY.API, []);
  });

  test("disconnect works as expected", async () => {
    const chatController = getChatController();
    await chatController.connect();
    const response = await chatController.disconnectParticipant();
    expect(chatClient.disconnectParticipant).toHaveBeenCalledWith("token");
    expect(response.testField).toBe("test");
    expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.DISCONNECT_PARTICIPANT, CSM_CATEGORY.API, false);
    expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.DISCONNECT_PARTICIPANT, expect.anything(), CSM_CATEGORY.API);
  });

  test("disconnect throws an error", async () => {
    const chatController = getChatController();
    await chatController.connect();
    chatClient.disconnectParticipant = jest.fn(() => Promise.reject("Error"));
    try {
      await chatController.disconnectParticipant();
      expect(false).toEqual(true);
    } catch (e) {
      expect(e).toEqual("Error");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.DISCONNECT_PARTICIPANT, CSM_CATEGORY.API, true);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.DISCONNECT_PARTICIPANT, expect.anything(), CSM_CATEGORY.API);
    }
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

  test("getTranscript throws an error", async () => {
    var args = {
      metadata: "metadata"
    };
    const chatController = getChatController();
    await chatController.connect();
    chatClient.getTranscript = jest.fn(() => Promise.reject({}));
    try {
      await chatController.getTranscript(args);
      expect(false).toEqual(true);
    } catch (e) {
      expect(e.metadata).toEqual("metadata");
      expect(csmService.addCountAndErrorMetric).toHaveBeenCalledWith(ACPS_METHODS.GET_TRANSCRIPT, CSM_CATEGORY.API, true, []);
      expect(csmService.addLatencyMetricWithStartTime).toHaveBeenCalledWith(ACPS_METHODS.GET_TRANSCRIPT, expect.anything(), CSM_CATEGORY.API, []);
    }
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

  test("ended event receive works as expected", async () => {
    const chatController = getChatController();
    await chatController.connect();
    const messageHandler = jest.fn();
    chatController.subscribe(CHAT_EVENTS.CHAT_ENDED, messageHandler);
    chatController.connectionHelper.$simulateEnding();
    await Utils.delay(1);
    expect(messageHandler).toHaveBeenCalledTimes(1);
  });
  test("should call breakConnection method when ended event is received", async () => {
    const chatController = getChatController();
    const breakConnectionSpy = jest.spyOn(chatController, "breakConnection");
    await chatController.connect();
    chatController.connectionHelper.$simulateConnectionEnding();
    expect(breakConnectionSpy).toHaveBeenCalledTimes(1);
  });
});
