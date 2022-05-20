import { UnImplementedMethodException } from "../core/exceptions";
import { GlobalConfig } from "../globalConfig";
import {
  REGION_CONFIG,
  REGIONS
} from "../constants";
import { LogManager } from "../log";
import { ConnectParticipant } from "./aws-sdk-connectparticipant";

class ChatClientFactoryImpl {
  constructor() {
    this.clientCache = {};
  }

  getCachedClient(optionsInput, logMetaData) {
    var options = Object.assign({}, optionsInput);
    var region = optionsInput.region || GlobalConfig.getRegion() || REGIONS.pdx;
    options.region = region;
    logMetaData.region = region;
    if (this.clientCache[region]) {
      return this.clientCache[region];
    }
    var client = this._createAwsClient(options, logMetaData);
    this.clientCache[region] = client;
    return client;
  }

  _createAwsClient(options, logMetaData) {
    var region = options.region;
    var endpointOverride = GlobalConfig.getEndpointOverride();
    var endpointUrl = `https://participant.connect.${region}.amazonaws.com`;
    if (endpointOverride) {
      endpointUrl = endpointOverride;
    }
    return new AWSChatClient({
      endpoint: endpointUrl,
      region: region,
      logMetaData
    });
  }
}

/*eslint-disable*/
class ChatClient {
  sendMessage(participantToken, message, type) {
    throw new UnImplementedMethodException("sendTextMessage in ChatClient");
  }

  sendAttachment(participantToken, attachment, metadata) {
    throw new UnImplementedMethodException("sendAttachment in ChatClient");
  }

  downloadAttachment(participantToken, attachmentId){
    throw new UnImplementedMethodException("downloadAttachment in ChatClient");
  }

  disconnectParticipant(participantToken) {
    throw new UnImplementedMethodException("disconnectParticipant in ChatClient");
  }

  sendEvent(connectionToken, contentType, content) {
    throw new UnImplementedMethodException("sendEvent in ChatClient");
  }

  createParticipantConnection(participantToken, type) {
    throw new UnImplementedMethodException("createParticipantConnection in ChatClient");
  }
}
/*eslint-enable*/

class AWSChatClient extends ChatClient {
  constructor(args) {
    super();
    var creds = new AWS.Credentials('','');
    var config = new AWS.Config({
      region: args.region,
      endpoint: args.endpoint,
      credentials: creds
    });
    this.chatClient = new AWS.ConnectParticipant(config);
    this.invokeUrl = args.endpoint;
    this.logger = LogManager.getLogger({ prefix: "ChatJS-ChatClient", logMetaData: args.logMetaData });
  }

  createParticipantConnection(participantToken, type) {
    let self = this;
      var params = {
        Type: type,
        ParticipantToken: participantToken
      };
      var createParticipantConnectionRequest = self.chatClient.createParticipantConnection(
        params
      );
      return self._sendRequest(createParticipantConnectionRequest).then((res) => {
        self.logger.info("Successfully create connection request")?.sendInternalLogToServer?.();
        return res;
      }).catch((err) => {
        self.logger.error("Error when creating connection request ", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  disconnectParticipant(connectionToken) {
    let self = this;
      var params = {
        ConnectionToken: connectionToken
      };

      var disconnectParticipantRequest = self.chatClient.disconnectParticipant(
        params
      );
      return self._sendRequest(disconnectParticipantRequest).then((res) => {
        self.logger.info("Successfully disconnect participant")?.sendInternalLogToServer?.();
        return res;
      }).catch((err) => {
        self.logger.error("Error when disconnecting participant ", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  getTranscript(connectionToken, args) {
    let self = this;
    var params = {
      MaxResults: args.maxResults,
      NextToken: args.nextToken,
      ScanDirection: args.scanDirection,
      SortOrder: args.sortOrder,
      StartPosition: {
        Id: args.startPosition.id,
        AbsoluteTime: args.startPosition.absoluteTime,
        MostRecent: args.startPosition.mostRecent
      },
      ConnectionToken: connectionToken
    };
    if (args.contactId) {
      params.ContactId = args.contactId;
    }
    var getTranscriptRequest = self.chatClient.getTranscript(params);
    return self._sendRequest(getTranscriptRequest).then((res) => {
      this.logger.info("Successfully get transcript");
      return res;
    }).catch((err) => {
      this.logger.error("Get transcript error", err);
      return Promise.reject(err);
    });
  }

  sendMessage(connectionToken, content, contentType) {
    let self = this;
      var params = {
        Content: content,
        ContentType: contentType,
        ConnectionToken: connectionToken
      };
      var sendMessageRequest = self.chatClient.sendMessage(params);
      return self._sendRequest(sendMessageRequest).then((res) => {
        const logContent = {id: res.data?.Id, contentType: params.ContentType};
        this.logger.debug("Successfully send message", logContent);
        return res;
      }).catch((err) => {
        this.logger.error("Send message error", err, {contentType: params.ContentType});
        return Promise.reject(err);
      });
  }

  sendAttachment(connectionToken, attachment, metadata) {
    let self = this;
    const startUploadRequestParams = {
      ContentType: attachment.type,
      AttachmentName: attachment.name,
      AttachmentSizeInBytes: attachment.size,
      ConnectionToken: connectionToken
    };
    const startUploadRequest = self.chatClient.startAttachmentUpload(startUploadRequestParams);
    const logContent = {contentType: attachment.type, size: attachment.size};
    return self._sendRequest(startUploadRequest)
        .then(startUploadResponse => {
          return self._uploadToS3(attachment, startUploadResponse.data.UploadMetadata)
              .then(() => {
                const completeUploadRequestParams = {
                  AttachmentIds: [ startUploadResponse.data.AttachmentId ],
                  ConnectionToken: connectionToken
                };
                this.logger.debug("Successfully upload attachment", {...logContent, attachmentId: startUploadResponse.data?.AttachmentId});
                const completeUploadRequest = self.chatClient.completeAttachmentUpload(completeUploadRequestParams);
                return self._sendRequest(completeUploadRequest);
              });
        }).catch((err) => {
          this.logger.error("Upload attachment error", err, logContent);
          return Promise.reject(err);
        });
  }

  _uploadToS3(file, metadata) {
    return fetch(metadata.Url,{
      method: "PUT",
      headers: metadata.HeadersToInclude,
      body: file
    });
  }

  downloadAttachment(connectionToken, attachmentId) {
    let self = this;
    const params = {
      AttachmentId: attachmentId,
      ConnectionToken: connectionToken
    };
    const logContent = {attachmentId};
    const getAttachmentRequest = self.chatClient.getAttachment(params);
    return self._sendRequest(getAttachmentRequest)
        .then(response => {
          this.logger.debug("Successfully download attachment", logContent);
          return self._downloadUrl(response.data.Url);
        }).catch(err => {
          this.logger.error("Download attachment error", err, logContent);
          return Promise.reject(err);
        });
  }

  _downloadUrl(url){
    return fetch(url)
        .then(t => t.blob())
        .catch(err => { return Promise.reject(err); });
  }

  sendEvent(connectionToken, contentType, content) {
    let self = this;
      var params = {
        ConnectionToken: connectionToken,
        ContentType: contentType,
        Content: content
      };
      var sendEventRequest = self.chatClient.sendEvent(params);
      const logContent = {contentType};
      return self._sendRequest(sendEventRequest).then((res) => {
        this.logger.debug("Successfully send event", {...logContent, id: res.data?.Id, });
        return res;
      }).catch((err) => {
        this.logger.error("Send event error", err, logContent);
        return Promise.reject(err);
      });
  }

  _sendRequest(request) {
    return new Promise((resolve, reject) => {
      request
        .on("success", function(res) {
          resolve(res);
        })
        .on("error", function(err) {
          const errObj = {
            type: err.code,
            message: err.message,
            stack: err.stack ? err.stack.split('\n') : [],
          }
          reject(errObj);
        })
        .send();
    });
  }
}

var ChatClientFactory = new ChatClientFactoryImpl();
export { ChatClientFactory };
