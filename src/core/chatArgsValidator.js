import Utils from "../utils";
import { IllegalArgumentException } from "./exceptions";
import { CONTENT_TYPE } from "../constants";

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
    let chatDetails = {};
    chatDetails.contactId = chatDetailsInput.ContactId || chatDetailsInput.contactId;
    chatDetails.participantId = chatDetailsInput.ParticipantId || chatDetailsInput.participantId;
    chatDetails.initialContactId = chatDetailsInput.InitialContactId || chatDetailsInput.initialContactId
    || chatDetails.contactId || chatDetails.ContactId;
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
