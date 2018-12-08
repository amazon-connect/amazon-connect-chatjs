import Utils from "../utils";
import { CONTENT_TYPE, VISIBILITY, PERSISTENCE } from "../constants";

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
      chatDetails.initialContactId,
      "chatDetails.initialContactId"
    );
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
    } else {
      Utils.assertIsNonEmptyString(
        chatDetails.participantToken,
        "chatDetails.participantToken"
      );
    }
  }

  validateInitiateChatResponse() {
    return true;
  }
}

export { ChatServiceArgsValidator };
