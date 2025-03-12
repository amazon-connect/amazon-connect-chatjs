
//Note: this imports AWS instead from aws-sdk npm package - details in ReadMe
import {
  ConnectParticipantClient,
  CreateParticipantConnectionCommand,
  DisconnectParticipantCommand,
  SendMessageCommand,
  StartAttachmentUploadCommand,
  CompleteAttachmentUploadCommand,
  GetAttachmentCommand,
  SendEventCommand,
  GetTranscriptCommand,
  CancelParticipantAuthenticationCommand,
  DescribeViewCommand,
  GetAuthenticationUrlCommand,
} from "./aws-sdk-connectparticipant";
import { UnImplementedMethodException } from "../core/exceptions";
import { GlobalConfig } from "../globalConfig";
import {
  REGIONS
} from "../constants";
import { LogManager } from "../log";
import throttle from "lodash.throttle";
import { CONTENT_TYPE, TYPING_VALIDITY_TIME } from '../constants';
import packageJson from '../../package.json';

const DEFAULT_PREFIX = "Amazon-Connect-ChatJS-ChatClient";

class ChatClientFactoryImpl {
  constructor() {
    this.clientCache = {};

  }

  getCachedClient(optionsInput, logMetaData) {
    let region = GlobalConfig.getRegionOverride() || optionsInput.region || GlobalConfig.getRegion() || REGIONS.pdx;
    logMetaData.region = region;
    if (this.clientCache[region]) {
      return this.clientCache[region];
    }
    let client = this._createAwsClient(region, logMetaData);
    this.clientCache[region] = client;
    return client;
  }

  _createAwsClient(region, logMetaData) {
    let endpointOverride = GlobalConfig.getEndpointOverride();
    let endpointUrl = `https://participant.connect.${region}.amazonaws.com`;
    if (endpointOverride) {
      endpointUrl = endpointOverride;
    }
    return new AWSChatClient({
      endpoint: endpointUrl,
      region: region,
      logMetaData,
      customUserAgentSuffix: GlobalConfig.getCustomUserAgentSuffix()
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

  downloadAttachment(participantToken, attachmentId) {
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

  describeView() {
    throw new UnImplementedMethodException("describeView in ChatClient");
  }

  getAuthenticationUrl() {
    throw new UnImplementedMethodException("getAuthenticationUrl in ChatClient");
  }

  cancelParticipantAuthentication() {
    throw new UnImplementedMethodException("cancelParticipantAuthentication in ChatClient");
  }
}
/*eslint-enable*/

class AWSChatClient extends ChatClient {
  constructor(args) {
    super();
    const customUserAgent = args.customUserAgentSuffix ? `AmazonConnect-ChatJS/${packageJson.version} ${args.customUserAgentSuffix}` : `AmazonConnect-ChatJS/${packageJson.version}`;
    this.chatClient = new ConnectParticipantClient({
      credentials: {
        accessKeyId: '',
        secretAccessKey: ''
      },
      endpoint: args.endpoint,
      region: args.region,
      customUserAgent
    });
    this.invokeUrl = args.endpoint;
    this.logger = LogManager.getLogger({ prefix: DEFAULT_PREFIX, logMetaData: args.logMetaData });
  }

  describeView(viewToken, connectionToken) {
    let self = this;
    let params = {
      ViewToken: viewToken,
      ConnectionToken: connectionToken
    };
    const command = new DescribeViewCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        self.logger.info("Successful describe view request")?.sendInternalLogToServer?.();
        return res;
      })
      .catch((err) => {
        self.logger.error("describeView gave an error response", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  cancelParticipantAuthentication(connectionToken, sessionId) {
    let self = this;
    let params = {
      ConnectionToken: connectionToken,
      SessionId: sessionId,
    }
    const command = new CancelParticipantAuthenticationCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        self.logger.info("Successful getAuthenticationUrl request")?.sendInternalLogToServer?.();
        return res;
      })
      .catch((err) => {
        self.logger.error("getAuthenticationUrl gave an error response", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  getAuthenticationUrl(connectionToken, redirectUri, sessionId) {
    let self = this;
    let params = {
      RedirectUri: redirectUri,
      SessionId: sessionId,
      ConnectionToken: connectionToken
    };
    const command = new GetAuthenticationUrlCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        self.logger.info("Successful getAuthenticationUrl request")?.sendInternalLogToServer?.();
        return res;
      })
      .catch((err) => {
        self.logger.error("getAuthenticationUrl gave an error response", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  createParticipantConnection(participantToken, type, acknowledgeConnection) {
    let self = this;
    var params = {
      ParticipantToken: participantToken,
      Type: type,
      ConnectParticipant: acknowledgeConnection
    };

    const command = new CreateParticipantConnectionCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        self.logger.info("Successfully create connection request")?.sendInternalLogToServer?.();
        return res;
      })
      .catch((err) => {
        self.logger.error("Error when creating connection request ", err)?.sendInternalLogToServer?.();
        return Promise.reject(err);
      });
  }

  disconnectParticipant(connectionToken) {
    let self = this;
    let params = {
      ConnectionToken: connectionToken
    };

    const command = new DisconnectParticipantCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        self.logger.info("Successfully disconnect participant")?.sendInternalLogToServer?.();
        return res;
      })
      .catch((err) => {
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
    const command = new GetTranscriptCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        this.logger.info("Successfully get transcript");
        return res;
      })
      .catch((err) => {
        this.logger.error("Get transcript error", err);
        return Promise.reject(err);
      });
  }

  sendMessage(connectionToken, content, contentType) {
    let self = this;
    let params = {
      Content: content,
      ContentType: contentType,
      ConnectionToken: connectionToken
    };
    const command = new SendMessageCommand(params);
    return self._sendRequest(command)
      .then((res) => {
        const logContent = { id: res.data?.Id, contentType: params.ContentType };
        this.logger.debug("Successfully send message", logContent);
        return res;
      })
      .catch((err) => {
        this.logger.error("Send message error", err, { contentType: params.ContentType });
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
    const startUploadCommand = new StartAttachmentUploadCommand(startUploadRequestParams);
    const logContent = { contentType: attachment.type, size: attachment.size };
    return self._sendRequest(startUploadCommand)
      .then(startUploadResponse => {
        return self._uploadToS3(attachment, startUploadResponse.data.UploadMetadata)
          .then(() => {
            const completeUploadRequestParams = {
              AttachmentIds: [startUploadResponse.data.AttachmentId],
              ConnectionToken: connectionToken
            };
            this.logger.debug("Successfully upload attachment", { ...logContent, attachmentId: startUploadResponse.data?.AttachmentId });
            const completeUploadCommand = new CompleteAttachmentUploadCommand(completeUploadRequestParams);
            return self._sendRequest(completeUploadCommand);
          });
      })
      .catch((err) => {
        this.logger.error("Upload attachment error", err, logContent);
        return Promise.reject(err);
      });
  }

  _uploadToS3(file, metadata) {
    return fetch(metadata.Url, {
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
    const logContent = { attachmentId };
    const command = new GetAttachmentCommand(params);
    return self._sendRequest(command)
      .then(response => {
        this.logger.debug("Successfully download attachment", logContent);
        return self._downloadUrl(response.data.Url);
      })
      .catch(err => {
        this.logger.error("Download attachment error", err, logContent);
        return Promise.reject(err);
      });
  }

  _downloadUrl(url) {
    return fetch(url)
      .then(t => t.blob())
      .catch(err => { return Promise.reject(err); });
  }


  sendEvent(connectionToken, contentType, content) {
    let self = this;
    if (contentType === CONTENT_TYPE.typing) {
      return self.throttleEvent(connectionToken, contentType, content)
    }
    return self._submitEvent(connectionToken, contentType, content);
  }

  throttleEvent = throttle((connectionToken, contentType, content) => {
    return this._submitEvent(connectionToken, contentType, content);
  }, TYPING_VALIDITY_TIME, { trailing: false, leading: true })

  _submitEvent(connectionToken, contentType, content) {
    let self = this;
    var params = {
      ConnectionToken: connectionToken,
      ContentType: contentType,
      Content: content
    };
    const command = new SendEventCommand(params);
    const logContent = { contentType };
    return self._sendRequest(command)
      .then((res) => {
        this.logger.debug("Successfully send event", { ...logContent, id: res.data?.Id });
        return res;
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }

  _sendRequest(command) {
    return this.chatClient.send(command)
      .then(response => {
        return { data: response };
      })
      .catch(error => {
        const errObj = {
          type: error.name,
          message: error.message,
          stack: error.stack ? error.stack.split('\n') : [],
          statusCode: error.$metadata ? error.$metadata.httpStatusCode : undefined,
        };
        return Promise.reject(errObj);
      });
  }
}

let ChatClientFactory = new ChatClientFactoryImpl();
export { ChatClientFactory };
