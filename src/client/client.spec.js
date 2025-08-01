import { ChatClientFactory } from "./client";
import { CONTENT_TYPE } from "../constants";
import { GlobalConfig } from "../globalConfig";
import packageJson from '../../package.json';
import {
  GetAttachmentCommand,
} from "./aws-sdk-connectparticipant";
  
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

    test("sendEvent supports clientToken parameter for idempotency", () => {
      jest.clearAllMocks();
      const submitEventSpy = jest.spyOn(chatClient, "_submitEvent").mockImplementation(() => {});
      
      // Use a non-typing content type to avoid throttling
      chatClient.sendEvent(connectionToken, CONTENT_TYPE.read, content, "client-token-123");
      
      expect(submitEventSpy).toHaveBeenCalledTimes(1);
      expect(submitEventSpy).toHaveBeenLastCalledWith(
        connectionToken, 
        CONTENT_TYPE.read, 
        content, 
        "client-token-123"
      );
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
      test("Supports clientToken parameter for idempotency", async () => {
        const sendRequestSpy = jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
        await chatClient.sendMessage("token", "content", "contentType", "client-token-123");
        
        expect(sendRequestSpy).toHaveBeenCalledTimes(1);
        const commandCall = sendRequestSpy.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          ConnectionToken: "token",
          Content: "content",
          ContentType: "contentType",
          ClientToken: "client-token-123"
        });
      });
      test("Works without clientToken parameter", async () => {
        const sendRequestSpy = jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
        await chatClient.sendMessage("token", "content", "contentType");
        
        expect(sendRequestSpy).toHaveBeenCalledTimes(1);
        const commandCall = sendRequestSpy.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          ConnectionToken: "token",
          Content: "content",
          ContentType: "contentType"
        });
        expect(commandCall.input.ClientToken).toBeUndefined();
      });
    });
    
    describe("_submitEvent", () => {
      beforeEach(() => {
        // Remove the mock implementation for _submitEvent so we can test it directly
        chatClient._submitEvent.mockRestore();
      });
      
      test("Supports clientToken parameter for idempotency", async () => {
        const sendRequestSpy = jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
        await chatClient._submitEvent("token", "contentType", "content", "client-token-123");
        
        expect(sendRequestSpy).toHaveBeenCalledTimes(1);
        const commandCall = sendRequestSpy.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          ConnectionToken: "token",
          ContentType: "contentType",
          Content: "content",
          ClientToken: "client-token-123"
        });
      });
      
      test("Works without clientToken parameter", async () => {
        const sendRequestSpy = jest.spyOn(chatClient, "_sendRequest").mockResolvedValue({});
        await chatClient._submitEvent("token", "contentType", "content");
        
        expect(sendRequestSpy).toHaveBeenCalledTimes(1);
        const commandCall = sendRequestSpy.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          ConnectionToken: "token",
          ContentType: "contentType",
          Content: "content"
        });
        expect(commandCall.input.ClientToken).toBeUndefined();
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

    describe("getAttachmentURL", () => {
      test("Successfully gets attachment URL", async () => {
        const mockResponse = {
          data: {
            Url: "https://example.com/attachment"
          }
        };
        jest.spyOn(chatClient, "_sendRequest").mockResolvedValueOnce(mockResponse);

        const result = await chatClient.getAttachmentURL("connectionToken", "attachmentId");

        expect(result).toBe("https://example.com/attachment");
        expect(chatClient._sendRequest).toHaveBeenCalledWith(
            expect.any(GetAttachmentCommand)
        );

        const commandCall = chatClient._sendRequest.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          AttachmentId: "attachmentId",
          ConnectionToken: "connectionToken"
        });
      });

      test("Handles error when getting attachment URL", async () => {
        const mockError = new Error("Failed to get URL");
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(mockError);

        await expect(
            chatClient.getAttachmentURL("connectionToken", "attachmentId")
        ).rejects.toEqual(mockError);

        expect(chatClient._sendRequest).toHaveBeenCalledWith(
            expect.any(GetAttachmentCommand)
        );

        const commandCall = chatClient._sendRequest.mock.calls[0][0];
        expect(commandCall.input).toEqual({
          AttachmentId: "attachmentId",
          ConnectionToken: "connectionToken"
        });
      });

      test("Logs success and error messages appropriately", async () => {
        const mockResponse = {
          data: {
            Url: "https://example.com/attachment"
          }
        };

        const debugSpy = jest.spyOn(chatClient.logger, "debug");
        const errorSpy = jest.spyOn(chatClient.logger, "error");

        jest.spyOn(chatClient, "_sendRequest").mockResolvedValueOnce(mockResponse);
        await chatClient.getAttachmentURL("connectionToken", "attachmentId");
        expect(debugSpy).toHaveBeenCalledWith(
            "Successfully get attachment URL",
            { attachmentId: "attachmentId" }
        );

        const mockError = new Error("Failed to get URL");
        jest.spyOn(chatClient, "_sendRequest").mockRejectedValueOnce(mockError);
        try {
          await chatClient.getAttachmentURL("connectionToken", "attachmentId");
        } catch (err) {
          expect(errorSpy).toHaveBeenCalledWith(
              "Get attachment URL error",
              mockError,
              { attachmentId: "attachmentId" }
          );
        }
      });
    });
  });
});