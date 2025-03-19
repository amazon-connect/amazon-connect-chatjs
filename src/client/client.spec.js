import { ChatClientFactory } from "./client";
import { CONTENT_TYPE } from "../constants";
import { GlobalConfig } from "../globalConfig";
import packageJson from '../../package.json';
  
jest.mock('../globalConfig', () => {
  return {
    GlobalConfig: {
      getRegionOverride: jest.fn(),
      getRegion: jest.fn(),
      getEndpointOverride: jest.fn(),
      getCustomUserAgentSuffix: jest.fn(),
    }
  }
});

describe("client test cases", () => {
  const connectionToken = "connectionToken";
  const content = "content";
  const options = {};
  const logMetaData = {};
  var chatClient = ChatClientFactory.getCachedClient(options, logMetaData);

  beforeEach(() => {
    jest.spyOn(chatClient, "_submitEvent").mockImplementation(() => {});
    jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe("event throttling test cases", () => {

    test("typing event should be throttled if content type is typing", () => {
      let count = 0;
      let typingInterval = setInterval(() => {
        if (count > 8) {
          clearInterval(typingInterval);
        }
        count++;
        chatClient.sendEvent(connectionToken, CONTENT_TYPE.typing, content);
      }, 100);
      jest.advanceTimersByTime(900);
      expect(chatClient._submitEvent).toHaveBeenCalledTimes(1);
    });

    test("Other events should not be throttled", () => {
      for (let key in CONTENT_TYPE) {
        jest.clearAllTimers();
        jest.clearAllMocks();
        if (key === "typing") {
          continue;
        }
        let count = 0;
        let typingInterval = setInterval(() => {
          if (count > 8) {
            clearInterval(typingInterval);
          }
          count++;
          chatClient.sendEvent(connectionToken, CONTENT_TYPE[key], content);
        }, 100);
        jest.advanceTimersByTime(900);
        expect(chatClient._submitEvent).toHaveBeenCalledTimes(9);
      }
    });
  });
  
  describe("Client Method Tests", () => {
    beforeEach(() => {
      jest.spyOn(chatClient, "_submitEvent").mockImplementation(() => {});
      jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
      jest.useFakeTimers();
      jest.clearAllTimers();
      jest.clearAllMocks();
    });
    const options = {};
    const logMetaData = {};
    var chatClient = ChatClientFactory.getCachedClient(options, logMetaData);

    describe("DescribeView", () => {
      test("No errors thrown in happy case", async () => {
        expect(chatClient.describeView("token", "type")).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.describeView("token", "type")).rejects.toThrow();
      });
    });

    describe("GetAuthenticationUrl", () => {
        test("No errors thrown in happy case", async () => {
          expect(chatClient.getAuthenticationUrl("connectionToken", "redirectUri", "sessionId")).resolves.toEqual({});
        });
        test("Promise rejects in error case", async () => {
          jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
          expect(chatClient.getAuthenticationUrl("connectionToken", "redirectUri", "sessionId")).rejects.toThrow();
        });
      });

    describe("cancelParticipantAuthentication", () => {
      test("No errors thrown in happy case", async () => {
        expect(chatClient.cancelParticipantAuthentication("connectionToken", "sessionId")).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.cancelParticipantAuthentication("connectionToken", "sessionId")).rejects.toThrow();
      });
    });

    describe("CreateParticipantConnection", () => {
      test("No errors thrown in happy case", async () => {
        expect(chatClient.createParticipantConnection("token", "type", "acknowledgeConnection")).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.createParticipantConnection("token", "type", "acknowledgeConnection")).rejects.toThrow();
      });
    });

    describe("DisconnectParticipant", () => {
      test("No errors thrown in happy case", async () => {
        expect(chatClient.disconnectParticipant("token")).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.disconnectParticipant("token")).rejects.toThrow();
      });
    });

    describe("GetTranscript", () => {
      const args = {
        maxResults: "maxResults",
        nextToken: "nextToken",
        scanDirection: "scanDirection",
        sortOrder: "sortOrder",
        startPosition: {
          id: "id",
          absoluteTime: "absoluteTime",
          mostRecent: "mostRecent",
        },
      }
      test("No errors thrown in happy case", async () => {
        expect(chatClient.getTranscript("token", args)).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.getTranscript("token", args)).rejects.toThrow();
      });
    });

    describe("SendMessage", () => {
      test("No errors thrown in happy case", async () => {
        expect(chatClient.sendMessage("token", "content", "contentType")).resolves.toEqual({});
      });
      test("Promise rejects in error case", async () => {
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(new Error());
        expect(chatClient.sendMessage("token", "content", "contentType")).rejects.toThrow();
      });
    });

    describe("UserAgent Configs", () => {
      test("Default suffix", async () => {
        expect(chatClient.chatClient.config.customUserAgent.length).toEqual(1);
        expect(chatClient.chatClient.config.customUserAgent[0][0]).toEqual(`AmazonConnect-ChatJS/${packageJson.version}`);
      });
      test("Passed insuffix", async () => {
        GlobalConfig.getCustomUserAgentSuffix.mockReturnValue('Test/1.0.0');
        const testClient = ChatClientFactory._createAwsClient(options, logMetaData);
        expect(testClient.chatClient.config.customUserAgent.length).toEqual(1);
        expect(testClient.chatClient.config.customUserAgent[0][0]).toEqual(`AmazonConnect-ChatJS/${packageJson.version} Test/1.0.0`);
      });
    });
  });
});