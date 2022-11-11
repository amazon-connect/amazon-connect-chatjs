import Utils from "../utils";
import { IllegalArgumentException } from "./exceptions";
import { CONTENT_TYPE, SESSION_TYPES } from "../constants";

class ChatControllerArgsValidator {
    /*eslint-disable no-unused-vars*/
    validateNewControllerDetails(chatDetails) {
        return true;
    }
    /*eslint-enable no-unused-vars*/

    validateSendMessage(args) {
        if (!Utils.isString(args.message)) {
            throw new IllegalArgumentException(args.message + "is not a valid message");
        }
        this.validateContentType(args.contentType);
    }

    validateContentType(contentType) {
        Utils.assertIsEnum(contentType, Object.values(CONTENT_TYPE), "contentType"); 
    }

    /*eslint-disable no-unused-vars*/
    validateConnectChat(args) {
        return true;
    }
    /*eslint-enable no-unused-vars*/

    validateLogger(logger) {
        Utils.assertIsObject(logger, "logger");
        ["debug", "info", "warn", "error"].forEach(methodName => {
            if (!Utils.isFunction(logger[methodName])) {
                throw new IllegalArgumentException(
                    methodName +
            " should be a valid function on the passed logger object!"
                );
            }
        });
    }

    validateSendEvent(args) {
        this.validateContentType(args.contentType);
    }

    /*eslint-disable no-unused-vars*/
    validateGetMessages(args) {
        return true;
    }
    /*eslint-enable no-unused-vars*/
}

class ChatServiceArgsValidator extends ChatControllerArgsValidator {
    validateChatDetails(chatDetails, sessionType) {
        Utils.assertIsObject(chatDetails, "chatDetails");
        if (sessionType===SESSION_TYPES.AGENT && !Utils.isFunction(chatDetails.getConnectionToken)) {
            throw new IllegalArgumentException(
                "getConnectionToken was not a function", 
                chatDetails.getConnectionToken
            );
        }
        Utils.assertIsNonEmptyString(
            chatDetails.contactId,
            "chatDetails.contactId"
        );
        Utils.assertIsNonEmptyString(
            chatDetails.participantId,
            "chatDetails.participantId"
        );
        if (sessionType===SESSION_TYPES.CUSTOMER){
            if (chatDetails.participantToken){
                Utils.assertIsNonEmptyString(
                    chatDetails.participantToken,
                    "chatDetails.participantToken"
                );
            } else {
                throw new IllegalArgumentException(
                    "participantToken was not provided for a customer session type",
                    chatDetails.participantToken
                );
            }
        }
    }

    validateInitiateChatResponse() {
        return true;
    }

    normalizeChatDetails(chatDetailsInput) {
        let chatDetails = {};
        chatDetails.contactId = chatDetailsInput.ContactId || chatDetailsInput.contactId;
        chatDetails.participantId = chatDetailsInput.ParticipantId || chatDetailsInput.participantId;
        chatDetails.initialContactId = chatDetailsInput.InitialContactId || chatDetailsInput.initialContactId
      || chatDetails.contactId || chatDetails.ContactId;
        chatDetails.getConnectionToken = chatDetailsInput.getConnectionToken || chatDetailsInput.GetConnectionToken;
        if (chatDetailsInput.participantToken || chatDetailsInput.ParticipantToken) {
            chatDetails.participantToken = chatDetailsInput.ParticipantToken || chatDetailsInput.participantToken;
        }
        this.validateChatDetails(chatDetails);
        return chatDetails;
    }
}

export { ChatServiceArgsValidator };
