import { ChatClientFactory } from "./client";
import { CONTENT_TYPE } from "../constants";
import { jest } from "@jest/globals";

describe("client test cases", () => {
  describe("event throttling test cases", () => {
    const options = {};
    const logMetaData = {};
    const connectionToken = "connectionToken";
    const content = "content";

    var chatClient = ChatClientFactory.getCachedClient(options, logMetaData);

    beforeEach(() => {
      jest.spyOn(chatClient, "_submitEvent").mockImplementation(() => {});
      jest.useFakeTimers();
      jest.clearAllTimers();
      jest.clearAllMocks();
    });

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
});
