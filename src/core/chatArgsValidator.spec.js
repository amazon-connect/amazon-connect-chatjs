import { CONTENT_TYPE } from "../constants";
import { ChatServiceArgsValidator } from "./chatArgsValidator";
import { IllegalArgumentException } from "./exceptions";

describe("ChatServiceArgsValidator", () => {

    function getValidator() {
        return new ChatServiceArgsValidator();
    }
    let chatDetailsInput;
    let expectedChatDetails;
    let chatDetails;
    let getConnectionToken = jest.fn();

    test("chatDetails w/o participantToken or connectionDetails normalized as expected", async () => {
        const chatArgsValidator = getValidator();
        chatDetailsInput = {
            ContactId: "cid",
            ParticipantId: "pid",
            InitialContactId: "icid",
            getConnectionToken: getConnectionToken
        };
        expectedChatDetails = {
            contactId: "cid",
            participantId: "pid",
            initialContactId: "icid",
            getConnectionToken: getConnectionToken
        };
        chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
        expect(chatDetails).toEqual(expectedChatDetails);
    });

    test("chatDetails w/ participantToken, w/o connectionDetails normalized as expected", async () => {
        const chatArgsValidator = getValidator();
        chatDetailsInput = {
            contactId: "cid",
            participantId: "pid",
            ParticipantToken: "ptoken"
        };
        expectedChatDetails = {
            contactId: "cid",
            participantId: "pid",
            initialContactId: "cid",
            participantToken: "ptoken"
        };
        chatDetails = chatArgsValidator.normalizeChatDetails(chatDetailsInput);
        expect(chatDetails).toEqual(expectedChatDetails);
    });

    test("validateSendEvent only passes on valid content types", () => {
        const sendEventRequest = {
            contentType: "application/vnd.amazonaws.connect.event.participant.inactive"
        };
        const chatArgsValidator = getValidator();
        chatArgsValidator.validateSendEvent(sendEventRequest);

        sendEventRequest.contentType = "application/vnd.amazonaws.connect.event.participant.disengaged";
        const validateCall = () => chatArgsValidator.validateSendEvent(sendEventRequest);
        expect(validateCall).toThrow(IllegalArgumentException);
    });

    test("validateSendMessage only passes on valid content types", () => {
      const sendMessageRequest = {
        message: "Hello world",
        contentType: CONTENT_TYPE.textPlain
      };
      const chatArgsValidator = getValidator();
      chatArgsValidator.validateSendMessage(sendMessageRequest);

      sendMessageRequest.contentType = CONTENT_TYPE.textMarkdown;
      expect(() => chatArgsValidator.validateSendMessage(sendMessageRequest)).not.toThrow();

      sendMessageRequest.contentType = CONTENT_TYPE.typing;
      expect(() => chatArgsValidator.validateSendMessage(sendMessageRequest)).toThrow(IllegalArgumentException);

      sendMessageRequest.contentType = "text/html";
      expect(() => chatArgsValidator.validateSendMessage(sendMessageRequest)).toThrow(IllegalArgumentException);
    });
});
