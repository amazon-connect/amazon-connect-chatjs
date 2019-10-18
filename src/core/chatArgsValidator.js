import Utils from "../utils";
import { PERSISTENCE } from "../constants";
import { IllegalArgumentException } from "./exceptions";

class ChatControllerArgsValidator {
  /*eslint-disable no-unused-vars*/
  validateNewControllerDetails(chatDetails) {
    return true;
  }
  /*eslint-enable no-unused-vars*/

  validateSendMessage(args) {
    if (!Utils.isString(args.message)) {
      Utils.assertIsObject(args.message, "message");
    }
    Utils.assertIsNonEmptyString(args.contentType, "contentType");
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
    if (args.persistence !== undefined) {
      Utils.assertIsEnum(
        args.persistence,
        Object.values(PERSISTENCE),
        "persistence"
      );
    }
    //New, keep.
    Utils.assertIsNonEmptyString(args.contentType, "contentType");
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
