import { ChatServiceArgsValidator } from "./chatArgsValidator";

describe("ChatServiceArgsValidator", () => {

  function getValidator() {
    return new ChatServiceArgsValidator();
  }
  let chatDetailsInput;
  let expectedChatDetails;
  let chatDetails;
  let getConnectionToken = jest.fn()

  test("chatDetails w/o participantToken or connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      ContactId: "cid",
      ParticipantId: "pid",
      InitialContactId: "icid",
      getConnectionToken: getConnectionToken
    }
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "icid",
      getConnectionToken: getConnectionToken
    }
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });

  test("chatDetails w/ participantToken, w/o connectionDetails normalized as expected", async () => {
    const chatArgsValidator = getValidator();
    chatDetailsInput = {
      contactId: "cid",
      participantId: "pid",
      ParticipantToken: "ptoken"
    }
    expectedChatDetails = {
      contactId: "cid",
      participantId: "pid",
      initialContactId: "cid",
      participantToken: "ptoken"
    }
    chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
    expect(chatDetails).toEqual(expectedChatDetails);
  });
});
