import { CHAT_EVENTS } from "../constants";
import { ConnectionHelperEvents } from "./connectionHelper";

class EventConstructor {
  fromConnectionHelperEvent(eventType, eventData, chatDetails) {
    var data = {
      data: eventData,
      chatDetails: chatDetails
    };
    var returnObject = {
      type: null,
      data: data
    };
    switch (eventType) {
      case ConnectionHelperEvents.Ended:
        data.retrying = false;
        returnObject.type = CHAT_EVENTS.CONNECTION_BROKEN;
        break;
      case ConnectionHelperEvents.DisconnectedReconnecting:
        data.retrying = true;
        returnObject.type = CHAT_EVENTS.CONNECTION_BROKEN;
        break;
      case ConnectionHelperEvents.Reconnected:
        data.connectCalled = false;
        returnObject.type = CHAT_EVENTS.CONNECTION_ESTABLISHED;
        break;
      case ConnectionHelperEvents.IncomingMessage:
        return this._fromIncomingData(eventData, chatDetails);
    }
  }

  _fromIncomingData(eventData, chatDetails) {
    var incomingData = JSON.parse(eventData.payloadString);
    var data = {
      data: incomingData,
      chatDetails: chatDetails
    };
    var returnObject = {
      type: null,
      data: data
    };
    switch (incomingData.Data.Type) {
      case "TYPING":
        returnObject.type = CHAT_EVENTS.INCOMING_TYPING;
        return returnObject;
    }
    // TODO this is not right! We are returning
    // a MESSAGE event even though this could be a custom event,
    // should there be an exhaustive list of events like PARTICIPANT_JOINED
    // recognized as MESSAGE?
    returnObject.type = CHAT_EVENTS.INCOMING_MESSAGE;
    return returnObject;
  }
}

export { EventConstructor };
