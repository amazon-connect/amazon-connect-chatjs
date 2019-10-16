import { UnImplementedMethodException } from "../core/exceptions";
import { makeHttpRequest } from "./XmlHttpClient";
import { GlobalConfig } from "../globalConfig";
import {
  RESOURCE_PATH,
  MESSAGE_PERSISTENCE,
  HTTP_METHODS,
  REGION_CONFIG,
  CONTENT_TYPE,
  CONNECTION_TOKEN_KEY,
  PARTICIPANT_TOKEN_KEY,
  REGIONS
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

  // sendMessage(connectionToken, message, type) {
  //   console.log(type);
  //   var body = {
  //     Message: {
  //       ContentType: CONTENT_TYPE.textPlain,
  //       Content: message,
  //       Persistence: MESSAGE_PERSISTENCE.PERSISTED
  //     }
  //   };
  //   var requestInput = {
  //     method: HTTP_METHODS.POST,
  //     headers: {},
  //     url: this.invokeUrl + RESOURCE_PATH.MESSAGE,
  //     body: body
  //   };
  //   requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
  //   return this._callHttpClient(requestInput);
  // }

  sendMessage(connectionToken, message, messageType){
    var legacy_args = {
      Message: {
        ContentType: messageType,
        Content: message,
        Persistence: MESSAGE_PERSISTENCE.PERSISTED
      }
    };
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.MESSAGE,
      body: legacy_args
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    var response = this._callHttpClient(requestInput)
      .then(response => {
        return new Promise(resolve => {
          resolve({
            data: {
              AbsoluteTime: response.data.Item.Data.CreatedTimestamp,
              Id: response.data.MessageId
            }
          });
        });
      });
    console.log(response);
    return response;

  }

  // getTranscript(connectionToken, args) {
  //   var requestInput = {
  //     method: HTTP_METHODS.POST,
  //     headers: {},
  //     url: this.invokeUrl + RESOURCE_PATH.TRANSCRIPT,
  //     body: args
  //   };
  //   requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
  //   return this._callHttpClient(requestInput);
  // }

  getTranscript(connectionToken, args) {
    
    var legacy_args = {};
    if (args.ContactId){
      legacy_args.ContactId = args.ContactId;
    }
    if (args.MaxResults){
      legacy_args.MaxResults = args.MaxResults;
    }
    if (args.NextToken){
      legacy_args.NextToken = args.NextToken;
    }
    if (args.ScanDirection){
      legacy_args.ScanDirection = args.ScanDirection;
    }
    if (args.SortOrder){
      legacy_args.SortKey = args.SortOrder;
    }
    if (args.StartPosition){
      legacy_args.StartKey = {};
      if (args.StartPosition.Id){
        legacy_args.StartKey.ItemId = args.StartPosition.Id;
      }
      if (args.StartPosition.MostRecent){
        legacy_args.StartKey.MostRecent = args.StartPosition.MostRecent;
      }
      if (args.StartPosition.AbsoluteTime) {
        legacy_args.StartKey.Timestamp = args.StartPosition.AbsoluteTime;
      }
    }
    console.log("legacy args for getTranscript: ");
    console.log(legacy_args);

    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.TRANSCRIPT,
      body: legacy_args
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    var response = this._callHttpClient(requestInput)
      .then(response => {
        return new Promise(resolve => {
          var new_response = {data:{}};
          new_response.data = {
            InitialContactId: response.data.Items[0].Data.InitialContactId,
            Transcript: [],
            NextToken: response.data.NextToken
          };
          var item;
          for (item of response.data.Items) {
            var new_item = {};
            new_item.Id = item.Data.ItemId;
            new_item.AbsoluteTime = item.Data.CreatedTimestamp;
            new_item.Type = item.Data.Type === "MESSAGE" ? "MESSAGE" : "EVENT";
            new_item.ContentType = new_item.Type === "MESSAGE" ? CONTENT_TYPE.textPlain : "application/vnd.amazonaws.connect.event.typing";
            new_item.Content = item.Data.Content;
            new_item.DisplayName = item.SenderDetails.DisplayName;
            new_item.ParticipantId = item.SenderDetails.ParticipantId;
            new_item.ParticipantRole = "AGENT";
            new_response.data.Transcript.push(new_item);
          }
          resolve(new_response);
        });
      });
    console.log(response);
    return response;
  }

  // sendEvent(connectionToken, eventType, messageIds, visibility, persistence) {
  //   console.log(messageIds);
  //   console.log(persistence);
  //   var body = {
  //     ParticipantEvent: {
  //       Visibility: visibility,
  //       ParticipantEventType: eventType
  //     }
  //   };
  //   var requestInput = {
  //     method: HTTP_METHODS.POST,
  //     headers: {},
  //     url: this.invokeUrl + RESOURCE_PATH.EVENT,
  //     body: body
  //   };
  //   requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
  //   return this._callHttpClient(requestInput);
  // }

  sendEvent(connectionToken, contentType, content, eventType, messageIds, visibility, persistence) {
    console.log(messageIds);
    console.log(persistence);
    var legacy_args = {
      ParticipantEvent: {
        Visibility: visibility,
        ParticipantEventType: eventType
      }
    };
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.EVENT,
      body: legacy_args
    };
    requestInput.headers[CONNECTION_TOKEN_KEY] = connectionToken;
    var new_response = this._callHttpClient(requestInput)
      .then(response => {
        return new Promise(resolve => {
          resolve({
            data: {
              AbsoluteTime: response.data.Item.Data.CreatedTimestamp,
              Id: response.data.Item.Data.ItemId
            }
          });
        });
      });
    console.log(new_response);
    return new_response;
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

  createParticipantConnection(participantToken, list=["WEBOSCKET", "CONNECTION_CREDENTIALS"]) {
    var requestInput = {
      method: HTTP_METHODS.POST,
      headers: {},
      url: this.invokeUrl + RESOURCE_PATH.CONNECTION_DETAILS,
      body: {}
    };
    requestInput.headers[PARTICIPANT_TOKEN_KEY] = participantToken;
    var response = this._callHttpClient(requestInput)
      .then(response => {
        return new Promise(resolve => {
          var new_response = {data: {}};
          if (list.contains("WEBSOCKET")){
            if (list.contains("CONNECTION_CREDENTIALS")){
              new_response.data = {
                Websocket: {
                  url: response.data.PreSignedConnectionUrl,
                  ConnectionExpiry: response.data.ParticipantCredentials.Expiry
                },
                ConnectionCredentials: {
                  ConnectionToken: response.data.ParticipantCredentials.ConnectionAuthenticationToken,
                  Expiry: response.data.ParticipantCredentials.Expiry
                }
              };
            } else {
              new_response.data = {
                Websocket: {
                  url: response.data.PreSignedConnectionUrl,
                  ConnectionExpiry: response.data.ParticipantCredentials.Expiry
                }
              };
            }
          } else {
            new_response.data = {
              ConnectionCredentials: {
                Connectiontoken: response.data.ParticipantCredentials.ConnectionAuthenticationToken,
                Expiry: response.data.ParticipantCredentials.Expiry
              }
            };
          }
          resolve(new_response);
        });
      });
    console.log(response);
    return response;
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
