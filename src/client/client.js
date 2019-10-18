import { UnImplementedMethodException } from "../core/exceptions";
import { makeHttpRequest } from "./XmlHttpClient";
import { GlobalConfig } from "../globalConfig";
import {
  RESOURCE_PATH,
  HTTP_METHODS,
  REGION_CONFIG,
  REGIONS,
  NEW_HEADER_VALUE,
  PARTICIPANT_TOKEN_KEY
} from "../constants";
import { LogManager } from "../log";

class ChatClientFactoryImpl {
  constructor() {
    this.clientCache = {};
  }

  getCachedClient(optionsInput) {
    var options = Object.assign({}, optionsInput);
    var region = optionsInput.region || GlobalConfig.getRegion() || REGIONS.pdx;
    options.region = region;
    if (this.clientCache[region]) {
      return this.clientCache[region];
    }
    var client = this._createClient(options);
    this.clientCache[region] = client;
    return client;
  }

  _createClient(options) {
    var region = options.region;
    var endpointOverride = GlobalConfig.getEndpointOverride();
    var stageConfig = REGION_CONFIG[region];
    if (endpointOverride) {
      stageConfig.invokeUrl = endpointOverride;
    }
    return new HttpChatClient({
      stageConfig: stageConfig
    });
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
    this.logger = LogManager.getLogger({ prefix: "ChatClient" });
  }

  sendMessage(connectionToken, content, contentType) {
    var body = {
      ContentType: contentType,
      Content: content,
    };
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.NEW_MESSAGE,
      body: body
    };
    requestInput.headers[NEW_HEADER_VALUE] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  getTranscript(connectionToken, args) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.NEW_TRANSCRIPT,
      body: args
    };
    requestInput.headers[NEW_HEADER_VALUE] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  sendEvent(connectionToken, contentType, content){
    var body = {
      ContentType: contentType
    };
    if (content!==null) {
      body.Content = content;
    }
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.NEW_EVENT,
      body: body
    };
    requestInput.headers[NEW_HEADER_VALUE] = connectionToken;
    return this._callHttpClient(requestInput);
  }

  disconnectChat(connectionToken) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.NEW_DISCONNECT,
      body: {}
    };
    requestInput.headers[NEW_HEADER_VALUE] = connectionToken;
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

  createParticipantConnection(participantToken) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.PARTICIPANT_CONNECTION,
      body: {}
    };
    requestInput.headers[NEW_HEADER_VALUE] = participantToken;
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
        try {
          errorObject.error = JSON.parse(request.responseText);
        } catch (e) {
          self.logger.warn("invalid json error from server");
          errorObject.error = null;
        }
        reject(errorObject);
      };
      self.callHttpClient(requestInput, success, failure);
    });
  }
}

var ChatClientFactory = new ChatClientFactoryImpl();
export { ChatClientFactory };
