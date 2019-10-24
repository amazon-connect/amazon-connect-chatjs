import { UnImplementedMethodException } from "../core/exceptions";
import { makeHttpRequest } from "./XmlHttpClient";
import { GlobalConfig } from "../globalConfig";
import {
  RESOURCE_PATH,
  HTTP_METHODS,
  REGION_CONFIG,
  REGIONS,
  PARTICIPANT_TOKEN_KEY
} from "../constants";
import { LogManager } from "../log";
import { AWS } from "./aws-client";

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
    var client = this._createAwsClient(options);
    this.clientCache[region] = client;
    return client;
  }

  _createAwsClient(options) {
    var region = options.region;
    var endpointOverride = GlobalConfig.getEndpointOverride();
    var stageConfig = REGION_CONFIG[region];
    if (endpointOverride) {
      stageConfig.invokeUrl = endpointOverride;
    }
    return new AWSChatClient({
      endpoint: stageConfig.invokeUrl,
      region: region
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

  createParticipantConnection(type, participantToken) {
    throw new UnImplementedMethodException("createConnection in ChatClient");
  }
}
/*eslint-enable*/

var createDefaultHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json"
});

class AWSChatClient extends ChatClient {
  constructor(args) {
    super();
    var creds = new AWS.Credentials({});
    var config = new AWS.Config({
      region: args.region,
      endpoint: args.endpoint,
      credentials: creds
    });
    this.chatClient = new AWS.ConnectParticipant(config);
    this.callHttpClient = makeHttpRequest;
    this.invokeUrl = args.endpoint;
    this.logger = LogManager.getLogger({ prefix: "ChatClient" });
    console.log(this.chatClient);
  }

  createParticipantConnection(participantToken, type) {
    let self = this;
    return new Promise((reject) => {
      var params = {
        Type: type,
        ParticipantToken: participantToken
      };
      var createParticipantConnectionRequest = self.chatClient.createParticipantConnection(
        params
      );
      self.sendRequest(createParticipantConnectionRequest).then((res) => {
        self.logger.info("successfully create participant connection");
        return res;
      }).catch((err) => {
        self.logger.error("error when create participant connection");
        reject(err);
      });
    });
  }

  disconnectParticipant(connectionToken) {
    let self = this;
    return new Promise((reject) => {
      var params = {
        ConnectionToken: connectionToken
      };

      var disconnectParticipantRequest = self.chatClient.disconnectParticipant(
        params
      );
      self.sendRequest(disconnectParticipantRequest).then((res) => {
        self.logger.info("successfully disconnect participant connection");
        return res;
      }).catch((err) => {
        self.logger.error("error when disconnect participant connection");
        reject(err);
      });
    });
  }

  getTranscript(connectionToken, args) {
    let self = this;
    return new Promise((reject) => {
      var params = {
        ContactId: args.IntialContactId,
        MaxResults: args.MaxResults,
        NextToken: args.NextToken,
        ScanDirection: args.ScanDirection,
        SortOrder: args.SortOrder,
        StartPosition: {
          Id: args.StartPosition.Id,
          AbsoluteTime: args.StartPosition.AbsoluteTime,
          MostRecent: args.StartPosition.MostRecent
        },
        ConnectionToken: connectionToken
      };
      var getTranscriptRequest = self.chatClient.getTranscript(params);
      self.sendRequest(getTranscriptRequest).then((res) => {
        self.logger.info("successfully get transcript");
        return res;
      }).catch((err) => {
        self.logger.error("error when get transcript");
        reject(err);
      });
    });
  }

  sendMessage(connectionToken, content, contentType) {
    let self = this;
    return new Promise((reject) => {
      var params = {
        Content: content,
        ContentType: contentType,
        ConnectionToken: connectionToken
      };
      var sendMessageRequest = self.chatClient.sendMessage(params);
      self.sendRequest(sendMessageRequest).then((res) => {
        self.logger.info("successfully send message");
        return res;
      }).catch((err) => {
        self.logger.error("error when send message");
        reject(err);
      });
    });
  }

  sendEvent(connectionToken, contentType, content) {
    let self = this;
    return new Promise((reject) => {
      var params = {
        ConnectionToken: connectionToken,
        ContentType: contentType,
        Content: content
      };
      var sendEventRequest = self.chatClient.sendEvent(params);
      self.sendRequest(sendEventRequest).then((res) => {
        self.logger.info("successfully send event");
        return res;
      }).catch((err) => {
        self.logger.error("error when send event");
        reject(err);
      });
    });
  }

  sendRequest(request) {
    return new Promise((resolve, reject) => {
      request
        .on("success", function(res) {
          resolve(res);
        })
        .on("error", function(err) {
          reject(err);
        })
        .send();
    });
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
