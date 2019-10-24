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
    Utils.assertIsNonEmptyString(contentType, "contentType");
    if (Object.values(CONTENT_TYPE).indexOf(contentType) === -1){
      throw new IllegalArgumentException(contentType + "is not a valid contentType");
    }
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
