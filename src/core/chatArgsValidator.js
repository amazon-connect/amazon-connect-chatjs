import Utils from "../utils";
import { CONTENT_TYPE, VISIBILITY, PERSISTENCE } from "../constants";
import { IllegalArgumentException } from "./exceptions";

class ChatControllerArgsValidator {
  /*eslint-disable no-unused-vars*/
  validateNewControllerDetails(chatDetails) {
    return true;
  }
  /*eslint-enable no-unused-vars*/

  validateSendMessage(message, type) {
    if (!Utils.isString(message)) {
      Utils.assertIsObject(message, "message");
    }
    Utils.assertIsEnum(type, Object.values(CONTENT_TYPE), "type");
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
    Utils.assertIsNonEmptyString(args.eventType, "eventType");
    if (args.messageIds !== undefined) {
      Utils.assertIsList(args.messageIds);
    }
    if (args.visibility !== undefined) {
      Utils.assertIsEnum(
        args.visibility,
        Object.values(VISIBILITY),
        "visibility"
      );
    }
    if (args.persistence !== undefined) {
      Utils.assertIsEnum(
        args.persistence,
        Object.values(PERSISTENCE),
        "persistence"
      );
    }
  }

  // TODO: Not sure about this API.
  /*eslint-disable no-unused-vars*/
  validateGetMessages(args) {
    return true;
  }
  /*eslint-enable no-unused-vars*/
}

class ChatServiceArgsValidator extends ChatControllerArgsValidator {
  validateChatDetails(chatDetails) {
    Utils.assertIsObject(chatDetails, "chatDetails");
    Utils.assertIsNonEmptyString(
      chatDetails.contactId,
      "chatDetails.contactId"
    );
    Utils.assertIsNonEmptyString(
      chatDetails.participantId,
      "chatDetails.participantId"
    );
    if (chatDetails.connectionDetails) {
      Utils.assertIsObject(
        chatDetails.connectionDetails,
        "chatDetails.connectionDetails"
      );
      Utils.assertIsNonEmptyString(
        chatDetails.connectionDetails.PreSignedConnectionUrl,
        "chatDetails.connectionDetails.PreSignedConnectionUrl"
      );
      Utils.assertIsNonEmptyString(
        chatDetails.connectionDetails.ConnectionId,
        "chatDetails.connectionDetails.ConnectionId"
      );
      Utils.assertIsNonEmptyString(
        chatDetails.connectionDetails.connectionToken,
        "chatDetails.connectionDetails.connectionToken"
      );
    } else if (chatDetails.participantToken){
      Utils.assertIsNonEmptyString(
        chatDetails.participantToken,
        "chatDetails.participantToken"
      );
    }
  }

  validateInitiateChatResponse() {
    return true;
  }

  normalizeChatDetails(chatDetailsInput) {
    var chatDetails = {};
    chatDetails.contactId = chatDetailsInput.ContactId || chatDetailsInput.contactId;
    chatDetails.participantId = chatDetailsInput.ParticipantId || chatDetailsInput.participantId;
    chatDetails.initialContactId = chatDetailsInput.InitialContactId || chatDetailsInput.initialContactId || chatDetails.contactId || chatDetails.ContactId;

    if (chatDetailsInput.participantToken || chatDetailsInput.ParticipantToken) {
      chatDetails.participantToken = chatDetailsInput.ParticipantToken || chatDetailsInput.participantToken;
      this.validateChatDetails(chatDetails);
      return chatDetails;
    } else if (
      chatDetailsInput.ChatConnectionAttributes &&
      chatDetailsInput.ChatConnectionAttributes.ParticipantCredentials
    ) {
      this.validateInitiateChatResponse(chatDetailsInput);
      var connectionDetails = {};
      connectionDetails.connectionToken =
        chatDetailsInput.ChatConnectionAttributes.ParticipantCredentials.ConnectionAuthenticationToken;
      connectionDetails.ConnectionId =
        chatDetailsInput.ChatConnectionAttributes.ConnectionId;
      connectionDetails.PreSignedConnectionUrl =
        chatDetailsInput.ChatConnectionAttributes.PreSignedConnectionUrl;
      chatDetails.connectionDetails = connectionDetails;
      return chatDetails;
    } else {
      this.validateChatDetails(chatDetails);
      return chatDetails;
    }
  }
}

export { ChatServiceArgsValidator };
