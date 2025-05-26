declare namespace connect {
  export const ChatSession: ChatSessionObject;

  export const ChatJS: ChatJSObject;

  interface ChatJSObject {
      readonly version: string;
      readonly name: string;
      readonly source: string;
      readonly repository: string;
      readonly build: {
          readonly timestamp: string;
          readonly environment: 'production' | 'development';
      };
  }

  // ==========
  // Main entry
  // ==========

  interface ChatSessionObject {
    /**
     * Creates a new agent chat session.
     * @param args The arguments of the operation.
     */
    create(args: AgentChatSessionArgs): AgentChatSession;

    /**
     * Creates a new customer chat session.
     * @param args The arguments of the operation.
     */
    create(args: CustomerChatSessionArgs): CustomerChatSession;

    /**
     * Setup the global configuration to use.
     * @param config The configuration to use.
     */
    setGlobalConfig(config: ChatGlobalConfig): void;

    /** Enumerates the log levels. */
    LogLevel: ChatLogLevel;

    Logger: ChatLogger;

    /** Enumerates the session types. */
    SessionTypes: ChatSessionTypes;

    csmService: CSMService;

    setFeatureFlag: SetFeatureFlag;

    setRegionOverride: SetRegionOverride;
  }

  // ==============
  // Create session
  // ==============

  /** Enumerates the session types. */
  interface ChatSessionTypes {
    readonly AGENT: "AGENT";
    readonly CUSTOMER: "CUSTOMER";
  }

  interface ChatDetailsInput {
    readonly contactId: string;
    readonly participantId: string;
    readonly participantToken: string;
  }

  /** Contains the options for a chat session. */
  interface ChatSessionOptions {
    /**
     * The AWS region.
     * @default "us-west-2"
     */
    readonly region?: string;
  }

  interface ChatSessionArgs {
    /** The details of the chat. */
    readonly chatDetails: ChatDetailsInput;

    /** The session options. */
    readonly options?: ChatSessionOptions;

    /** The session type. */
    readonly type: ChatSessionTypes[keyof ChatSessionTypes];
  }

  interface CustomerChatSessionArgs extends ChatSessionArgs {
    readonly type: ChatSessionTypes["CUSTOMER"];

    /** disable client-side-metric so errors/debug messages won't be logged with AWS Connect. */
    readonly disableCSM?: boolean;
  }

  interface AgentChatSessionArgs extends ChatSessionArgs {
    readonly type: ChatSessionTypes["AGENT"];

    /**
     * The `amazon-connect-streams` websocket manager obtained with `connect.core.getWebSocketManager()`.
     */
    readonly websocketManager: WebSocketManager;
  }

  /**
   * WebSocketManager interface for the websocket manager from amazon-connect-streams
   */
  interface WebSocketManager {
    onConnectionGain: (callback: (event: unknown) => void) => void;
    onConnectionLost: (callback: (event: unknown) => void) => void;
    onMessage: (callback: (event: unknown) => void) => void;
    sendMessage: (message: Record<string, unknown>) => void;
    connect: () => void;
    disconnect: () => void;
  }

  // =======
  // Logging
  // =======

  /** Enumerates the log levels. */
  interface ChatLogLevel {
    readonly DEBUG: 10;
    readonly INFO: 20;
    readonly WARN: 30;
    readonly ERROR: 40;
  }

  /** Contains the global chat configuration. */
  interface ChatGlobalConfig extends ChatSessionOptions {
    /** The logging configuration. */
    readonly loggerConfig?: {
      /** Custom logger implementation */
      readonly customizedLogger?: {
        /** Debug level logging function */
        debug: (...msg: any[]) => void;
        /** Info level logging function */
        info: (...msg: any[]) => void;
        /** Warning level logging function */
        warn: (...msg: any[]) => void;
        /** Error level logging function */
        error: (...msg: any[]) => void;
      };

      /** The logging level */
      readonly level?: ChatLogLevel[keyof ChatLogLevel];

      /** Flag to use default logger */
      readonly useDefaultLogger?: boolean;
    };

    /** AWS Region for the chat service */
    readonly region?: string;

    /** Feature configurations */
    readonly features?: {
      /** Message receipt configuration */
      messageReceipts?: {
        /** Enable/disable Read/Delivered receipts */
        shouldSendMessageReceipts?: boolean;
        /** Throttle time in milliseconds before sending Read/Delivered receipt */
        throttleTime?: number;
      };
    };

    /** Custom user agent suffix */
    readonly customUserAgentSuffix?: string;

    /** WebSocket manager configuration for React Native */
    readonly webSocketManagerConfig?: {
      isNetworkOnline: () => boolean;
    }
  }

  interface ChatLogger {
    /**
     * Adds a log entry with the debug level.
     * @param message The log message.
     */
    debug(message: string): void;

    /**
     * Adds a log entry with the info level.
     * @param message The log message.
     */
    info(message: string): void;

    /**
     * Adds a log entry with the warn level.
     * @param message The log message.
     */
    warn(message: string): void;

    /**
     * Adds a log entry with the error level.
     * @param message The log message.
     */
    error(message: string): void;
  }

  // ============
  // Chat session
  // ============

  /**
   * Represents the network connection status
   */
  interface NetworkLinkStatus {
    readonly NeverEstablished: "NeverEstablished";
    readonly Establishing: "Establishing";
    readonly Established: "Established";
    readonly Broken: "Broken";
  }

  /**
   * The ChatController interface that handles the core chat functionality
   */
  interface ChatController {
    subscribe(eventName: string, callback: (event: unknown) => void): void;
    sendMessage(args: SendMessageArgs): Promise<ParticipantServiceResponse<SendMessageResult>>;
    sendAttachment(args: SendAttachmentArgs): Promise<ParticipantServiceResponse<SendAttachmentResult>>;
    downloadAttachment(args: DownloadAttachmentArgs): Promise<Blob>;
    sendEvent(args: SendEventArgs): Promise<ParticipantServiceResponse<SendEventResult>>;
    getTranscript(args: GetTranscriptArgs): Promise<ParticipantServiceResponse<GetTranscriptResult>>;
    connect(args?: ConnectArgs): Promise<ConnectChatResult>;
    getChatDetails(): ChatDetails;
    describeView(args: DescribeViewArgs): Promise<ParticipantServiceResponse<DescribeViewResult>>;
    getAuthenticationUrl(args: GetAuthenticationUrlArgs): Promise<ParticipantServiceResponse<GetAuthenticationUrlResult>>;
    cancelParticipantAuthentication(args: CancelParticipantAuthenticationArgs): Promise<ParticipantServiceResponse<void>>;
    cleanUpOnParticipantDisconnect?(): void;
    disconnectParticipant?(): Promise<ParticipantServiceResponse<void>>;
  }

  interface ChatSessionInterface {
    controller: ChatController;

    /** Gets the chat session details. */
    getChatDetails(): ChatDetails;

    // ==========================================
    // Amazon Connect Participant Service wrapper
    // ==========================================

    /**
     * Attempts to connect the chat session.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CreateParticipantConnection.html
     * @param args The arguments of the operation.
     */
    connect(args?: ConnectArgs): Promise<ConnectChatResult>;
    connect<T>(
      args?: WithMetadata<ConnectArgs, T>
    ): Promise<WithMetadata<ConnectChatResult, T>>;

    /**
     * Retrieves the transcript of the current session.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html
     * @param args The arguments of the operation.
     */
    getTranscript(
      args: GetTranscriptArgs
    ): Promise<ParticipantServiceResponse<GetTranscriptResult>>;
    getTranscript<T>(
      args: WithMetadata<GetTranscriptArgs, T>
    ): Promise<
      WithMetadata<ParticipantServiceResponse<GetTranscriptResult>, T>
    >;

    cancelParticipantAuthentication(
      args: CancelParticipantAuthenticationArgs
    ): Promise<ParticipantServiceResponse<void>>;

    /**
     * Cancels an ongoing participant authentication flow for a session, with optional metadata.
     * @param args The arguments of the operation plus additional metadata.
     */
    cancelParticipantAuthentication<T>(
      args: WithMetadata<CancelParticipantAuthenticationArgs, T>
    ): Promise<
      WithMetadata<
        ParticipantServiceResponse<void>,
        T
      >
    >;

    /**
     * Retrieves the authentication URL for a participant.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAuthenticationUrl.html
     * @param args The arguments of the operation.
     */
    getAuthenticationUrl(
      args: GetAuthenticationUrlArgs
    ): Promise<ParticipantServiceResponse<GetAuthenticationUrlResult>>;

    /**
     * Retrieves the authentication URL for a participant, with optional metadata.
     * @param args The arguments of the operation plus additional metadata.
     */
    getAuthenticationUrl<T>(
      args: WithMetadata<GetAuthenticationUrlArgs, T>
    ): Promise<
      WithMetadata<ParticipantServiceResponse<GetAuthenticationUrlResult>, T>
    >;

    /**
     * Sends an event as the current session's participant.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html
     * @param args The arguments of the operation.
     */
    sendEvent(
      args: SendEventArgs
    ): Promise<ParticipantServiceResponse<SendEventResult>>;
    sendEvent<T>(
      args: WithMetadata<SendEventArgs, T>
    ): Promise<WithMetadata<ParticipantServiceResponse<SendEventResult>, T>>;

    /**
     * Uploads a file
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_StartAttachmentUpload.html
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CompleteAttachmentUpload.html
     * @param args The arguments of the operation.
     */
    sendAttachment(args: SendAttachmentArgs): Promise<ParticipantServiceResponse<SendAttachmentResult>>;
    sendAttachment<T>(
      args: WithMetadata<SendAttachmentArgs, T>
    ): Promise<WithMetadata<ParticipantServiceResponse<SendAttachmentResult>, T>>;

    /**
     * Downloads a file
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAttachment.html
     * @param args The arguments of the operation.
     */
    downloadAttachment(args: DownloadAttachmentArgs): Promise<Blob>;
    downloadAttachment<T>(
      args: WithMetadata<DownloadAttachmentArgs, T>
    ): Promise<WithMetadata<Blob, T>>;

    /**
     * Sends a message as the current session's participant.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html
     * @param args The arguments of the operation.
     */
    sendMessage(
      args: SendMessageArgs
    ): Promise<ParticipantServiceResponse<SendMessageResult>>;
    sendMessage<T>(
      args: WithMetadata<SendMessageArgs, T>
    ): Promise<WithMetadata<ParticipantServiceResponse<SendMessageResult>, T>>;

    describeView(
      args: DescribeViewArgs
    ): Promise<ParticipantServiceResponse<DescribeViewResult>>;
    describeView<T>(
      args: WithMetadata<DescribeViewArgs, T>
    ): Promise<WithMetadata<ParticipantServiceResponse<DescribeViewResult>, T>>;

    // ======
    // Events
    // ======

    /**
     * Subscribes an event handler that triggers when the session connection is broken.
     * @param handler The event handler.
     */
    onConnectionBroken(
      handler: (event: ChatConnectionBrokenEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the session connection is established.
     * @param handler The event handler.
     */
    onConnectionEstablished(
      handler: (event: ChatConnectionEstablishedEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the authenticate customer flow is initiated.
     * @param handler The event handler.
     */
    onAuthenticationInitiated(
      handler: (event: ChatAuthenticationInitiatedEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the authenticate customer flow is successful.
     * @param handler The event handler.
     */
    onAuthenticationSuccessful(
      handler: (event: ChatMessageEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the authenticate customer flow fails.
     * @param handler The event handler.
     */
    onAuthenticationFailed(
      handler: (event: ChatMessageEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the authenticate customer flow times out.
     * @param handler The event handler.
     */
    onAuthenticationTimeout(
      handler: (event: ChatMessageEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the authenticate customer flow is canceled.
     * @param handler The event handler.
     */
    onAuthenticationCanceled(
      handler: (event: ChatMessageEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when a participant's display name is updated.
     * @param handler The event handler.
     */
    onParticipantDisplayNameUpdated(
      handler: (event: ChatParticipantDisplayNameUpdatedEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when the session is ended.
     * @param handler The event handler.
     */
    onEnded(handler: (event: ChatEndedEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when the session connection is lost.
     * @param handler The event handler.
     */
    onConnectionLost(
      handler: (event: ChatConnectionLostEvent) => void
    ): void;

    /**
     * Subscribes an event handler that triggers when a message event is received.
     * @param handler The event handler.
     */
    onMessage(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a typing event from the customer or agent occurs.
     * @param handler The event handler.
     */
    onTyping(handler: (event: ChatTypingEvent) => void): void;

    /**
      * Subscribes an event handler that triggers when a read message event is received from the customer or agent.
      * @param handler The event handler.
      */
    onReadReceipt(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a delivered message event is received from the customer or agent.
     * @param handler The event handler.
     */
    onDeliveredReceipt(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a customer or agent "application/vnd.amazonaws.connect.event.participant.idle" event is received.
     * @param handler The event handler.
     */
    onParticipantIdle(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a customer or agent "application/vnd.amazonaws.connect.event.participant.returned" event is received.
     * @param handler The event handler.
     */
    onParticipantReturned(handler: (event: ChatMessageEvent) => void): void;


    /**
     * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.invited" event is received.
     * @param handler The event handler.
     */
    onParticipantInvited(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers whenever a "application/vnd.amazonaws.connect.event.participant.autodisconnection" event is created by any participant.
     * @param handler The event handler.
     */
    onAutoDisconnection(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a websocket heartbeat is received successfully.
     * @param handler The event handler.
     */
    onDeepHeartbeatSuccess(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when a websocket heartbeat fails.
     * @param handler The event handler.
     */
    onDeepHeartbeatFailure(handler: (event: ChatMessageEvent) => void): void;

    /**
     * Subscribes an event handler that triggers when pChat hydration completes and chats from previous contact conversation are available in the transcript.
     * @param handler The event handler.
     */
    onChatRehydrated(handler: (event: ChatMessageEvent) => void): void;
  }

  interface AgentChatSession extends ChatSessionInterface {
    /** Cleans up all event handlers. */
    cleanUpOnParticipantDisconnect(): void;
  }

  interface CustomerChatSession extends ChatSessionInterface {
    /**
     * Disconnects the customer from the chat session.
     * Once this method is called, the chat session cannot be used anymore.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_DisconnectParticipant.html
     */
    disconnectParticipant(): Promise<ParticipantServiceResponse<void>>;
  }

  interface ChatDetails {
    readonly contactId: string;
    readonly initialContactId: string;
    readonly participantId: string;
    readonly participantToken?: string;
    readonly connectionDetails?: {
      readonly connectionToken: string;
      readonly ConnectionId: string;
      readonly PreSignedConnectionUrl: string;
    };
  }

  // ==========================================
  // Amazon Connect Participant Service wrapper
  // ==========================================

  type ChatEventContentType =
    | "application/vnd.amazonaws.connect.event.typing"
    | "application/vnd.amazonaws.connect.event.message.read"
    | "application/vnd.amazonaws.connect.event.message.delivered"
    | "application/vnd.amazonaws.connect.event.participant.joined"
    | "application/vnd.amazonaws.connect.event.participant.left"
    | "application/vnd.amazonaws.connect.event.participant.idle"
    | "application/vnd.amazonaws.connect.event.participant.returned"
    | "application/vnd.amazonaws.connect.event.participant.invited"
    | "application/vnd.amazonaws.connect.event.participant.autodisconnection"
    | "application/vnd.amazonaws.connect.event.transfer.succeeded"
    | "application/vnd.amazonaws.connect.event.transfer.failed"
    | "application/vnd.amazonaws.connect.event.chat.ended"
    | "application/vnd.amazonaws.connect.event.chat.rehydrated"
    | "application/vnd.amazonaws.connect.event.connection.acknowledged"
    | "application/vnd.amazonaws.connect.event.authentication.initiated"
    | "application/vnd.amazonaws.connect.event.authentication.succeeded"
    | "application/vnd.amazonaws.connect.event.authentication.failed"
    | "application/vnd.amazonaws.connect.event.authentication.timeout"
    | "application/vnd.amazonaws.connect.event.authentication.expired"
    | "application/vnd.amazonaws.connect.event.authentication.cancelled"
    | "application/vnd.amazonaws.connect.event.participant.displayname.updated";


  type ChatMessageContentType =
    | "text/plain"
    | "text/markdown"
    | "text/csv"
    | "application/msword"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    | "application/json"
    | "application/pdf"
    | "application/vnd.ms-powerpoint"
    | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    | "application/vnd.ms-excel"
    | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    | "image/jpeg"
    | "image/png"
    | "audio/wav"
    | "audio/x-wav"
    | "audio/vnd.wave"
    | "application/vnd.amazonaws.connect.message.interactive"
    | "application/vnd.amazonaws.connect.message.interactive.response";

  type ChatContentType = ChatEventContentType | ChatMessageContentType;

  /**
   * A subset of `aws-sdk`'s `Response` class.
   * This declaration is duplicated given that `aws-sdk` is currently embedded and not an explicit dependency.
   * See: https://github.com/aws/aws-sdk-js/blob/master/lib/response.d.ts
   */
  interface AWSResponse<D> {
    /**
     * The de-serialized response data from the service.
     * Can be null if an error occurred.
     */
    data: D | void;

    /**
     * A structure containing information about a service or networking error.
     */
    error: Error | void;

    /**
     * Returns the unique request ID associated with the response.
     * Log this value when debugging requests for AWS support.
     */
    requestId: string;

    /** The number of redirects that were followed before the request was completed. */
    redirectCount: number;

    /** The number of retries that were attempted before the request was completed. */
    retryCount: number;
  }

  interface ChatMetadata<T> {
    /**
     * An arbitrary metadata value that is fowarded when a promise resolves or rejects.
     * This value is not used by `amazon-connect-chatjs`, it's intended for developer usage.
     */
    readonly metadata: T;
  }

  type WithMetadata<D, M> = D & ChatMetadata<M>;
  type ParticipantServiceResponse<D> = AWSResponse<D>;

  type ConnectArgs = {};

  interface ConnectChatResult {
    /** A value indicating whether the Amazon Connect Participant Service was called. */
    connectCalled: boolean;

    /** A value indicating whether the operation succeeded. */
    connectSuccess: boolean;
  }

  /**
   * An object that is transformed to a request of the Amazon Connect Participant Service `GetTranscript` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html#API_GetTranscript_RequestSyntax
   */
  interface GetTranscriptArgs {
    /** The contactId from the current contact chain for which transcript is needed. */
    readonly contactId?: string;

    /**
     * The maximum number of results to return in the page.
     * @default 15
     */
    readonly maxResults?: number;

    /**
     * The pagination token.
     * Use the value returned previously in the next subsequent request to retrieve the next set of results.
     */
    readonly nextToken?: string;

    /**
     * The direction from StartPosition from which to retrieve message.
     * @default "BACKWARD"
     */
    readonly scanDirection?: "FORWARD" | "BACKWARD";

    /**
     * The sort order for the records.
     * @default "ASCENDING"
     */
    readonly sortOrder?: "DESCENDING" | "ASCENDING";

    /** A filtering option for where to start. */
    readonly startPosition?: {
      /**
       * The time in ISO format where to start.
       * It's specified in ISO 8601 format: `yyyy-MM-ddThh:mm:ss.SSSZ`.
       * For example, `2019-11-08T02:41:28.172Z`.
       */
      readonly absoluteTime?: string;

      /** The ID of the message or event where to start. */
      readonly id?: string;

      /**
       * The start position of the most recent message where you want to start.
       * Contraints: min:0, max:100
       */
      readonly mostRecent?: number;
    };
  }

  /**
   * Represents the response of the Amazon Connect Participant Service `GetTranscript` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetTranscript.html#API_GetTranscript_ResponseSyntax
   */
  interface GetTranscriptResult {
    /** The initial contact ID for the contact. */
    readonly InitialContactId: string;

    /**
     * The pagination token.
     * Use the value returned previously in the next subsequent request to retrieve the next set of results.
     */
    readonly NextToken: string;

    /** The list of messages in the session. */
    readonly Transcript: ChatTranscriptItem[];
  }

  /**
 * The arguments for canceling an ongoing participant authentication flow.
 * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CancelParticipantAuthentication.html
 */
  interface CancelParticipantAuthenticationArgs {
    /**
     * The unique identifier for the active chat session.
     */
    sessionId: string;
  }

  /**
   * The arguments for retrieving the authentication URL for a participant.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAuthenticationUrl.html
   */
  interface GetAuthenticationUrlArgs {
    /**
     * The URI where the user should be redirected after the authentication flow completes.
     */
    redirectUri: string;
    /**
     * The unique identifier for the active chat session.
     */
    sessionId: string;
  }

  /**
   * The result of a get authentication URL request, typically includes the authentication URL.
   * Extend as needed to include fields returned by the service.
   */
  interface GetAuthenticationUrlResult {
    /**
     * The URL used to initiate the participant's authentication flow.
     */
    AuthenticationUrl?: string;
  }


  /**
   * A chat transcript item.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html
   */
  interface ChatTranscriptItem {
    /**
     * The time when the message or event was sent.
     * It's specified in ISO 8601 format: `yyyy-MM-ddThh:mm:ss.SSSZ`.
     * For example, `2019-11-08T02:41:28.172Z`.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-AbsoluteTime
     */
    readonly AbsoluteTime: string;

    /**
     * List of attachment information.
     */
    readonly Attachments?: AttachmentItem[];

    /**
     * The content of the message or event.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-Content
     */
    readonly Content?: string;

    /**
     * The type of content of the item.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-ContentType
     */
    readonly ContentType?: ChatContentType;

    /**
     * The chat display name of the sender.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-DisplayName
     */
    readonly DisplayName?: string;

    /**
     * The ID of the item.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-Id
     */
    readonly Id: string;

    /**
     * The ID of the sender in the session.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-ParticipantId
     */
    readonly ParticipantId?: string;

    /**
     * The role of the sender.
     * For example, is it a customer, agent, or system.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-ParticipantRole
     */
    readonly ParticipantRole?: "AGENT" | "CUSTOMER" | "SYSTEM";

    /**
     * Type of the item: message or event.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-Type
     */
    readonly Type: "MESSAGE" | "EVENT" | "ATTACHMENT" | "CONNECTION_ACK";
  }

  /**
   * Information about an attachment.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_AttachmentItem.html
   */
  interface AttachmentItem {
    /**
     * A unique identifier for the attachment.
     */
    readonly AttachmentId: string;

    /**
     * A case-sensitive name of the attachment being uploaded.
     */
    readonly AttachmentName: string;

    /**
     * The MIME file type of the attachment.
     * For a list of supported file types, see: https://docs.aws.amazon.com/connect/latest/adminguide/amazon-connect-service-limits.html#feature-limits
     */
    readonly ContentType: string;

    /**
     * Status of the attachment.
     */
    readonly Status: "APPROVED" | "REJECTED" | "IN_PROGRESS";
  }

  /**
   * An object that is transformed to a request of the Amazon Connect Participant Service `SendMessage` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_RequestSyntax
   */
  interface SendMessageArgs {
    /** The content of the message. */
    message: string;

    /** The message content type. */
    contentType: ChatMessageContentType;
  }

  /**
   * Represents the response of the Amazon Connect Participant Service `SendMessage` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_ResponseSyntax
   */
  interface SendMessageResult {
    /**
     * The time when the message was sent.
     * It's specified in ISO 8601 format: `yyyy-MM-ddThh:mm:ss.SSSZ`.
     * For example, `2019-11-08T02:41:28.172Z`.
     */
    readonly AbsoluteTime: string;

    /** The ID of the message. */
    readonly Id: string;
  }

  /**
   * An object that is transformed to a request of the Amazon Connect Participant Service `SendEvent` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_RequestSyntax
   */
  interface SendEventArgs {
    /**
     * The content of the event to be sent (for example, message text).
     * This is not yet supported.
     */
    content?: string;

    /** The content type of the request. */
    contentType: ChatEventContentType;
  }

  /**
   * An object that is transformed to a request of the Amazon Connect Participant Service `StartAttachmentUpload and Complete Attachment Upload` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_StartAttachmentUpload.html
   */
  interface SendAttachmentArgs {
    /**
     * An HTML file object
     * https://developer.mozilla.org/en-US/docs/Web/API/File
     */
    attachment: File;
  }

  /**
   * An object that is transformed to a request of the Amazon Connect Participant Service `GetAttachment` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_GetAttachment.html
   */
  interface DownloadAttachmentArgs {
    attachmentId: string;
  }

  /**
   * Represents the response of the Amazon Connect Participant Service `SendEvent` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendEvent.html#API_SendEvent_ResponseSyntax
   */
  interface SendEventResult {
    /**
     * The time when the event was sent.
     * It's specified in ISO 8601 format: `yyyy-MM-ddThh:mm:ss.SSSZ`.
     * For example, `2019-11-08T02:41:28.172Z`.
     */
    readonly AbsoluteTime: string;

    /** The ID of the response. */
    readonly Id: string;
  }

  /**
 * Represents the response of the Amazon Connect Participant Service `CompleteAttachmentUpload` API.
 * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_CompleteAttachmentUpload.html
 */
  interface SendAttachmentResult {
  }

  /**
 * An object that is transformed to a request of the Amazon Connect Participant Service `SendMessage` API.
 * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_RequestSyntax
 */
  interface DescribeViewArgs {
    /**
     * The identifier of the Amazon Connect instance. You can find the instanceId in the ARN of
     * the instance.
     * @public
     */
    InstanceId: string | undefined;

    /**
     * The ViewId of the view. This must be an ARN for Amazon Web Services managed views.
     * @public
     */
    viewToken: string | undefined;
    /**
     * additional metadata to echo back in response
     * @public
     */
    metadata?: unknown;
  }

  /**
   * Represents the response of the Amazon Connect Participant Service `SendMessage` API.
   * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_SendMessage.html#API_SendMessage_ResponseSyntax
   */
  interface DescribeViewResult {
    /**
      * All view data is contained within the View object.
      * @public
      */
    View?: View;
  }

  // ======
  // Events
  // ======

  interface ChatEventData extends ChatTranscriptItem {
    /** The contact id associated to this message or event. */
    readonly ContactId?: string;

    /** The initial contact id associated to this message or event. */
    readonly InitialContactId?: string;
  }

  interface ChatConnectionBrokenEvent {
    readonly chatDetails: ChatDetails;
  }

  interface ChatConnectionEstablishedEvent {
    readonly chatDetails: ChatDetails;
  }

  interface ChatEndedEvent {
    readonly chatDetails: ChatDetails;
  }

  interface ChatConnectionLostEvent {
    readonly chatDetails: ChatDetails;
  }

  interface ChatMessageEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: Exclude<
        ChatContentType,
        "application/vnd.amazonaws.connect.event.typing"
      >;
    };
  }

  interface ChatAuthenticationInitiatedEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: "application/vnd.amazonaws.connect.event.authentication.initiated";
      Content: string; // Contains JSON with SessionId
    };
  }

  interface ChatParticipantDisplayNameUpdatedEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: "application/vnd.amazonaws.connect.event.participant.displayname.updated";
      DisplayName: string;
    };
  }

  interface ChatTypingEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: "application/vnd.amazonaws.connect.event.typing";
    };
  }

  /**
   * Client-side metrics service for tracking API metrics (count, latency, error count)
   */
  interface CSMService {
    widgetType: string;
    logger: {
      options: Record<string, unknown>;
      debug(...args: unknown[]): void;
      info(...args: unknown[]): void;
      warn(...args: unknown[]): void;
      error(...args: unknown[]): void;
      advancedLog(...args: unknown[]): void;
      _shouldLog(level: number): boolean;
      _writeToClientLogger(level: number, logStatement: string): void;
      _log(level: number, args: unknown[]): void;
      _convertToSingleStatement(args: unknown[]): string;
      _convertToString(arg: unknown): string;
    };
    csmInitialized: boolean;
    metricsToBePublished: Record<string, unknown>[];
    agentMetricToBePublished: Record<string, unknown>[];
    MAX_RETRY: number;
    loadCsmScriptAndExecute(): void;
    initializeCSM(): void;
    updateCsmConfig(csmConfig: Record<string, unknown>): void;
    _hasCSMFailedToImport(): boolean;
    getDefaultDimensions(): {
      name: string;
      value: string;
    }[];
    addMetric(metric: Record<string, unknown>): void;
    setDimensions(metric: Record<string, unknown>, dimensions: Array<{ name: string, value: string }>): void;
    addLatencyMetric(method: string, timeDifference: number, category: string, otherDimensions?: Array<{ name: string, value: string }>): void;
    addLatencyMetricWithStartTime(method: string, startTime: number, category: string, otherDimensions?: Array<{ name: string, value: string }>): void;
    addCountAndErrorMetric(method: string, category: string, error: boolean, otherDimensions?: Array<{ name: string, value: string }>): void;
    addCountMetric(method: string, category: string, otherDimensions?: Array<{ name: string, value: string }>): void;
    addAgentCountMetric(metricName: string, count: number): void;
  }

  interface SetFeatureFlag {
    (feature: string): void
  }

  interface SetRegionOverride {
    (regionOverride: string): void
  }

  interface View {
    /**
     * The identifier of the view.
     * @public
     */
    Id?: string;

    /**
     * The Amazon Resource Name (ARN) of the view.
     * @public
     */
    Arn?: string;

    /**
     * The name of the view.
     * @public
     */
    Name?: string;

    /**
     * Indicates the view status as either <code>SAVED</code> or <code>PUBLISHED</code>. The
     *     <code>PUBLISHED</code> status will initiate validation on the content.
     * @public
     */
    Status?: ViewStatus;

    /**
     * The type of the view - <code>CUSTOMER_MANAGED</code>.
     * @public
     */
    Type?: ViewType;

    /**
     * The description of the view.
     * @public
     */
    Description?: string;

    /**
     * Current version of the view.
     * @public
     */
    Version?: number;

    /**
     * The description of the version.
     * @public
     */
    VersionDescription?: string;

    /**
     * View content containing all content necessary to render a view except for runtime input
     *    data.
     * @public
     */
    Content?: ViewContent;

    /**
     * The tags associated with the view resource (not specific to view version).
     * @public
     */
    Tags?: Record<string, string>;

    /**
     * The timestamp of when the view was created.
     * @public
     */
    CreatedTime?: Date;

    /**
     * Latest timestamp of the <code>UpdateViewContent</code> or <code>CreateViewVersion</code>
     *    operations.
     * @public
     */
    LastModifiedTime?: Date;

    /**
     * Indicates the checksum value of the latest published view content.
     * @public
     */
    ViewContentSha256?: string;
  }

  /** Enumerates the ViewStatus. */
  interface ViewStatus {
    readonly PUBLISHED: "PUBLISHED";
    readonly SAVED: "SAVED";
  }

  /** Enumerates the ViewType. */
  interface ViewType {
    readonly AWS_MANAGED: "AWS_MANAGED";
    readonly CUSTOMER_MANAGED: "CUSTOMER_MANAGED";
  }

  /**
   * View content containing all content necessary to render a view except for runtime input
   *    data.
   * @public
   */
  export interface ViewContent {
    /**
     * The data schema matching data that the view template must be provided to render.
     * @public
     */
    InputSchema?: string;

    /**
     * The view template representing the structure of the view.
     * @public
     */
    Template?: string;

    /**
     * A list of possible actions from the view.
     * @public
     */
    Actions?: string[];
  }

}
