import Utils from "../utils";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { IllegalJsonException } from "./exceptions";


describe("ChatServiceArgsValidator", () => {

  function getValidator() {
    return new ChatServiceArgsValidator();
  }
  let chatDetailsInput;
  let expectedChatDetails;
  let chatDetails;
  let mockFn = jest.fn();

  test("chatDetails w/o participantToken or connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      ContactId: "cid",
      ParticipantId: "pid",
      InitialContactId: "icid",
      getConnectionToken: mockFn
    }
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "icid",
      getConnectionToken: mockFn
    }
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });

  test("chatDetails w/ participantToken, w/o connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      contactId: "cid",
      participantId: "pid",
      ParticipantToken: "ptoken",
      getConnectionToken: mockFn
    }
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "cid",
      participantToken: "ptoken",
      getConnectionToken: mockFn
    }
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });

  test("chatDetails w/ participantToken, w/ connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      contactId: "cid",
      participantId: "pid",
      participantToken: "ptoken",
      initialContactId: "icid",
      getConnectionToken: mockFn,
      ChatConnectionAttributes: {
        ParticipantCredentials: {
          ConnectionAuthenticationToken: "cat"
        },
        ConnectionId: "conid",
        PreSignedConnectionUrl: "url"
      }
    };
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "icid",
      participantToken: "ptoken",
      getConnectionToken: mockFn
    }
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });

  test("chatDetails w/o participantToken, w/ connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      contactId: "cid",
      participantId: "pid",
      participantToken: null,
      initialContactId: "icid",
      getConnectionToken: mockFn,
      ChatConnectionAttributes: {
        ParticipantCredentials: {
          ConnectionAuthenticationToken: "cat"
        },
        ConnectionId: "conid",
        PreSignedConnectionUrl: "url"
      }
    };
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "icid",
      getConnectionToken: mockFn,
      connectionDetails: {
        connectionToken: "cat",
        ConnectionId: "conid",
        PreSignedConnectionUrl: "url"
      }
    };
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });
});
