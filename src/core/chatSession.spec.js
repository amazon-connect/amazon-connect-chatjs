import { ChatSessionObject } from "./chatSession";
import { SESSION_TYPES } from "../constants";
import { csmService } from "../service/csmService";
import { CHAT_SESSION_FACTORY } from "./chatSession";

describe("ChatSession", () => {

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(csmService, 'initializeCSM').mockImplementation(() => { });
    jest.spyOn(CHAT_SESSION_FACTORY, 'createChatSession').mockImplementation(() => { });
  });

  test("should initialize csm for customer sessions", async () => {
    const args = {
      type: SESSION_TYPES.CUSTOMER
    };
    ChatSessionObject.create(args);
    expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
    expect(csmService.initializeCSM).toHaveBeenCalled();
  });

  test("should not initialize csm for non-customer sessions", async () => {
    const args = {
      type: SESSION_TYPES.AGENT
    };
    ChatSessionObject.create(args);
    expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
    expect(csmService.initializeCSM).not.toHaveBeenCalled();
  });

  test("should not initialize csm when session type is missing", async () => {
    const args = {};
    ChatSessionObject.create(args);
    expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
    expect(csmService.initializeCSM).not.toHaveBeenCalled();
  });
});