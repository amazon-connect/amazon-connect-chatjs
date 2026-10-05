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

    test("chatDetails without participantToken normalizes without throwing", async () => {
        const chatArgsValidator = getValidator();
        chatDetails = chatArgsValidator.normalizeChatDetails({
            contactId: "cid",
            participantId: "pid"
        });
        expect(chatDetails).toEqual({
            contactId: "cid",
            participantId: "pid",
            initialContactId: "cid"
        });
        expect(chatDetails.participantToken).toBeUndefined();
    });

    describe("participantToken requirement for a customer session", () => {
        const detailsWithoutToken = { contactId: "cid", participantId: "pid" };

        test("still applies without a customChatClient", () => {
            expect(() => getValidator().validateChatDetails(detailsWithoutToken, "CUSTOMER"))
                .toThrow(IllegalArgumentException);
        });

        test("is skipped when a customChatClient is in use", () => {
            expect(() => getValidator().validateChatDetails(detailsWithoutToken, "CUSTOMER", true))
                .not.toThrow();
        });

        test("customChatClient does not skip the other chatDetails checks", () => {
            expect(() => getValidator().validateChatDetails({ participantId: "pid" }, "CUSTOMER", true))
                .toThrow();
        });

        test("normalizeChatDetails forwards the flag and still omits sessionType", () => {
            const validator = getValidator();
            const spy = jest.spyOn(validator, "validateChatDetails");
            validator.normalizeChatDetails(detailsWithoutToken, true);
            expect(spy).toHaveBeenCalledWith(expect.any(Object), undefined, true);
            validator.normalizeChatDetails(detailsWithoutToken);
            expect(spy).toHaveBeenLastCalledWith(expect.any(Object), undefined, false);
        });
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
});
