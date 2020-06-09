declare namespace connect {
  export const ChatSession: ChatSessionObject;

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

    /** Enumerates the session types. */
    SessionTypes: ChatSessionTypes;
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
  }

  interface AgentChatSessionArgs extends ChatSessionArgs {
    readonly type: ChatSessionTypes["AGENT"];

    /**
     * The `amazon-connect-streams` websocket manager obtained with `connect.core.getWebSocketManager()`.
     */
    readonly websocketManager: any;
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
      /** The logger object. */
      readonly logger?: ChatLogger;

      /**
       * The logging level.
       * @default connect.ChatSession.LogLevel.INFO
       */
      readonly level?: ChatLogLevel[keyof ChatLogLevel];
    };
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

  interface ChatSession {
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
     * Subscribes an event handler that triggers when the session is ended.
     * @param handler The event handler.
     */
    onEnded(handler: (event: ChatEndedEvent) => void): void;

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
  }

  interface AgentChatSession extends ChatSession {
    /** Cleans up all event handlers. */
    cleanUpOnParticipantDisconnect(): void;
  }

  interface CustomerChatSession extends ChatSession {
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
    | "application/vnd.amazonaws.connect.event.participant.joined"
    | "application/vnd.amazonaws.connect.event.participant.left"
    | "application/vnd.amazonaws.connect.event.transfer.succeeded"
    | "application/vnd.amazonaws.connect.event.transfer.failed"
    | "application/vnd.amazonaws.connect.event.chat.ended";

  type ChatMessageContentType = "text/plain";

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
     * The content of the message or event.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-Content
     */
    readonly Content?: string;

    /**
     * The type of content of the item.
     * See: https://docs.aws.amazon.com/connect-participant/latest/APIReference/API_Item.html#connectparticipant-Type-Item-ContentType
     */
    readonly ContentType: ChatContentType;

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
    readonly Type: "MESSAGE" | "EVENT" | "CONNECTION_ACK";
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

  interface ChatMessageEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: Exclude<
        ChatContentType,
        "application/vnd.amazonaws.connect.event.typing"
      >;
    };
  }

  interface ChatTypingEvent {
    readonly chatDetails: ChatDetails;
    readonly data: ChatEventData & {
      ContentType: "application/vnd.amazonaws.connect.event.typing";
    };
  }
}
