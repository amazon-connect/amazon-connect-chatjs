import {
  IllegalArgumentException,
  UnImplementedMethodException
} from "../core/exceptions";
import { makeHttpRequest } from "./XmlHttpClient";
import {
  RESOURCE_PATH,
  HTTP_METHODS,
  STAGE_CONFIG,
  CONTENT_TYPE,
  MESSAGE_PERSISTENCE,
  CONNECTION_TOKEN_KEY,
  PARTICIPANT_TOKEN_KEY
} from "../constants";

class ChatClientFactoryImpl {
  getClient(stage) {
    if ("PROD" === stage) {
      return new HttpChatClient({
        stageConfig: STAGE_CONFIG.PROD
      });
    }
    throw new IllegalArgumentException(
      "unrecognized stage in ChatClientFactoryImpl"
    );
  }
}

/*eslint-disable*/
class ChatClient {
  sendMessage(participantToken, message, type) {
    throw new UnImplementedMethodException("sendTextMessage in ChatClient");
  }

  disconnectChat(participantToken) {
    throw new UnImplementedMethodException("disconnectChat in ChatClient");
  }

  sendEvent(eventType, messageIds, visibility, persistence) {
    throw new UnImplementedMethodException("sendEvent in ChatClient");
  }

  createConnectionDetails(participantToken) {
    throw new UnImplementedMethodException("reconnectChat in ChatClient");
  }
}
/*eslint-enable*/

var createDefaultHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json"
});

class HttpChatClient extends ChatClient {
  constructor(args) {
    super();
    this.invokeUrl = args.stageConfig.invokeUrl;
    this.callHttpClient = makeHttpRequest;
  }

  sendMessage(connectionToken, message, type) {
    console.log(type);
    var body = {
      Message: {
        ContentType: CONTENT_TYPE.textPlain,
        Content: message,
        Persistence: MESSAGE_PERSISTENCE.PERSISTED
      }
    };
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.MESSAGE,
      body: body
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  getTranscript(connectionToken, args) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.TRANSCRIPT,
      body: args
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  sendEvent(connectionToken, eventType, messageIds, visibility, persistence) {
    console.log(messageIds);
    console.log(persistence);
    var body = {
      ParticipantEvent: {
        Visibility: visibility,
        ParticipantEventType: eventType
      }
    };
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.EVENT,
      body: body
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  disconnectChat(connectionToken) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.DISCONNECT,
      body: {}
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  createConnectionDetails(participantToken) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.CONNECTION_DETAILS,
      body: {}
    };
    requestInput.headers[PARTICIPANT_TOKEN_KEY] = participantToken;
    return this._callHttpClient(requestInput);
  }

  _callHttpClient(requestInput) {
    var self = this;
    requestInput.headers = Object.assign(
      createDefaultHeaders(),
      requestInput.headers
    );
    requestInput.body = JSON.stringify(requestInput.body);
    return new Promise(function(resolve, reject) {
      var success = request => {
        var responseObject = {};
        responseObject.data = JSON.parse(request.responseText);
        resolve(responseObject);
      };
      var failure = request => {
        var errorObject = {};
        errorObject.statusText = request.statusText;
        reject(errorObject);
      };
      self.callHttpClient(requestInput, success, failure);
    });
  }
}

var ChatClientFactory = new ChatClientFactoryImpl();
export { ChatClientFactory };
