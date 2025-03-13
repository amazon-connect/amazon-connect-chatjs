//Placeholder
export const CHAT_CONFIGURATIONS = {
    CONCURRENT_CHATS: 10
};
export const PARTICIPANT_TOKEN_HEADER = "x-amzn-connect-participant-token";
export const AUTH_HEADER = "X-Amz-Bearer";

export const DEFAULT_MESSAGE_RECEIPTS_THROTTLE_MS = 5000;

export const FEATURES = {
    MESSAGE_RECEIPTS_ENABLED: "MESSAGE_RECEIPTS_ENABLED"
};

export const RESOURCE_PATH = {
    CONNECTION_DETAILS: "/contact/chat/participant/connection-details",
    MESSAGE: "/participant/message",
    TRANSCRIPT: "/participant/transcript",
    EVENT: "/participant/event",
    DISCONNECT: "/participant/disconnect",
    PARTICIPANT_CONNECTION: "/participant/connection",
    ATTACHMENT: "/participant/attachment"
};

export const SESSION_TYPES = {
    AGENT: "AGENT",
    CUSTOMER: "CUSTOMER"
};

export const CSM_CATEGORY = {
    API: "API",
    UI: "UI"
};

export const ACPS_METHODS = {
    SEND_MESSAGE: "SendMessage",
    SEND_ATTACHMENT: "SendAttachment",
    DOWNLOAD_ATTACHMENT: "DownloadAttachment",
    SEND_EVENT: "SendEvent",
    GET_TRANSCRIPT: "GetTranscript",
    DISCONNECT_PARTICIPANT: "DisconnectParticipant",
    CREATE_PARTICIPANT_CONNECTION: "CreateParticipantConnection",
    DESCRIBE_VIEW: "DescribeView",
};

export const WEBSOCKET_EVENTS = {
    ConnectionLost: "WebsocketConnectionLost",
    ConnectionGained: "WebsocketConnectionGained",
    Ended: "WebsocketEnded",
    IncomingMessage: "WebsocketIncomingMessage",
    InitWebsocket: "InitWebsocket",
    DeepHeartbeatSuccess: "WebsocketDeepHeartbeatSuccess",
    DeepHeartbeatFailure: "WebsocketDeepHeartbeatFailure"
};

export const CHAT_EVENTS = {
    INCOMING_MESSAGE: "INCOMING_MESSAGE",
    INCOMING_TYPING: "INCOMING_TYPING",
    INCOMING_READ_RECEIPT: "INCOMING_READ_RECEIPT",
    INCOMING_DELIVERED_RECEIPT: "INCOMING_DELIVERED_RECEIPT",
    CONNECTION_ESTABLISHED: "CONNECTION_ESTABLISHED",
    CONNECTION_LOST: "CONNECTION_LOST",
    CONNECTION_BROKEN: "CONNECTION_BROKEN",
    CONNECTION_ACK: "CONNECTION_ACK",
    CHAT_ENDED: "CHAT_ENDED",
    MESSAGE_METADATA: "MESSAGEMETADATA",
    PARTICIPANT_IDLE: "PARTICIPANT_IDLE",
    PARTICIPANT_RETURNED: "PARTICIPANT_RETURNED",
    PARTICIPANT_INVITED: "PARTICIPANT_INVITED",
    AUTODISCONNECTION: "AUTODISCONNECTION",
    DEEP_HEARTBEAT_SUCCESS: "DEEP_HEARTBEAT_SUCCESS",
    DEEP_HEARTBEAT_FAILURE: "DEEP_HEARTBEAT_FAILURE",
    AUTHENTICATION_INITIATED: "AUTHENTICATION_INITIATED",
    AUTHENTICATION_SUCCESSFUL: "AUTHENTICATION_SUCCESSFUL",
    AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
    AUTHENTICATION_TIMEOUT: "AUTHENTICATION_TIMEOUT",
    AUTHENTICATION_EXPIRED: "AUTHENTICATION_EXPIRED",
    AUTHENTICATION_CANCELED: "AUTHENTICATION_CANCELED",
    PARTICIPANT_DISPLAY_NAME_UPDATED: "PARTICIPANT_DISPLAY_NAME_UPDATED",
    CHAT_REHYDRATED: "CHAT_REHYDRATED"
};

export const CONTENT_TYPE = {
    textPlain: "text/plain",
    textMarkdown: "text/markdown",
    textCsv: "text/csv",
    applicationDoc: "application/msword",
    applicationDocx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    applicationJson: "application/json",
    applicationPdf: "application/pdf",
    applicationPpt: "application/vnd.ms-powerpoint",
    applicationPptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    applicationXls: "application/vnd.ms-excel",
    applicationXlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    authenticationInitiated: "application/vnd.amazonaws.connect.event.authentication.initiated",
    authenticationSuccessful: "application/vnd.amazonaws.connect.event.authentication.succeeded",
    authenticationFailed: "application/vnd.amazonaws.connect.event.authentication.failed",
    authenticationTimeout: "application/vnd.amazonaws.connect.event.authentication.timeout",
    authenticationExpired: "application/vnd.amazonaws.connect.event.authentication.expired",
    authenticationCanceled: "application/vnd.amazonaws.connect.event.authentication.cancelled",
    participantDisplayNameUpdated: "application/vnd.amazonaws.connect.event.participant.displayname.updated",
    imageJpg: "image/jpeg",
    imagePng: "image/png",
    audioWav: "audio/wav",
    audioXWav: "audio/x-wav", //Firefox
    audioVndWave: "audio/vnd.wave", //IE
    connectionAcknowledged: "application/vnd.amazonaws.connect.event.connection.acknowledged",
    typing: "application/vnd.amazonaws.connect.event.typing",
    participantJoined: "application/vnd.amazonaws.connect.event.participant.joined",
    participantLeft: "application/vnd.amazonaws.connect.event.participant.left",
    participantActive: "application/vnd.amazonaws.connect.event.participant.active",
    participantInactive: "application/vnd.amazonaws.connect.event.participant.inactive",
    transferSucceeded: "application/vnd.amazonaws.connect.event.transfer.succeeded",
    transferFailed: "application/vnd.amazonaws.connect.event.transfer.failed",
    chatEnded: "application/vnd.amazonaws.connect.event.chat.ended",
    interactiveMessage: "application/vnd.amazonaws.connect.message.interactive",
    interactiveMessageResponse: "application/vnd.amazonaws.connect.message.interactive.response",
    readReceipt: "application/vnd.amazonaws.connect.event.message.read",
    deliveredReceipt: "application/vnd.amazonaws.connect.event.message.delivered",
    participantIdle: "application/vnd.amazonaws.connect.event.participant.idle",
    participantReturned: "application/vnd.amazonaws.connect.event.participant.returned",
    participantInvited: "application/vnd.amazonaws.connect.event.participant.invited",
    autoDisconnection: "application/vnd.amazonaws.connect.event.participant.autodisconnection",
    chatRehydrated: "application/vnd.amazonaws.connect.event.chat.rehydrated"
};

export const CHAT_EVENT_TYPE_MAPPING = {
    [CONTENT_TYPE.typing]: CHAT_EVENTS.INCOMING_TYPING,
    [CONTENT_TYPE.readReceipt]: CHAT_EVENTS.INCOMING_READ_RECEIPT,
    [CONTENT_TYPE.deliveredReceipt]: CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT,
    [CONTENT_TYPE.participantIdle]: CHAT_EVENTS.PARTICIPANT_IDLE,
    [CONTENT_TYPE.authenticationInitiated]: CHAT_EVENTS.AUTHENTICATION_INITIATED,
    [CONTENT_TYPE.authenticationSuccessful]: CHAT_EVENTS.AUTHENTICATION_SUCCESSFUL,
    [CONTENT_TYPE.authenticationFailed]: CHAT_EVENTS.AUTHENTICATION_FAILED,
    [CONTENT_TYPE.authenticationTimeout]: CHAT_EVENTS.AUTHENTICATION_TIMEOUT,
    [CONTENT_TYPE.authenticationExpired]: CHAT_EVENTS.AUTHENTICATION_EXPIRED,
    [CONTENT_TYPE.authenticationCanceled]: CHAT_EVENTS.AUTHENTICATION_CANCELED,
    [CONTENT_TYPE.participantDisplayNameUpdated]: CHAT_EVENTS.PARTICIPANT_DISPLAY_NAME_UPDATED,
    [CONTENT_TYPE.participantReturned]: CHAT_EVENTS.PARTICIPANT_RETURNED,
    [CONTENT_TYPE.participantInvited]: CHAT_EVENTS.PARTICIPANT_INVITED,
    [CONTENT_TYPE.autoDisconnection]: CHAT_EVENTS.AUTODISCONNECTION,
    [CONTENT_TYPE.chatRehydrated]: CHAT_EVENTS.CHAT_REHYDRATED,
    default: CHAT_EVENTS.INCOMING_MESSAGE
};

export const EVENT = "EVENT";
export const MESSAGE = "MESSAGE";
export const CONN_ACK_FAILED = "CONN_ACK_FAILED";

export const TRANSCRIPT_DEFAULT_PARAMS = {
    MAX_RESULTS: 15,
    SORT_ORDER: "ASCENDING",
    SCAN_DIRECTION: "BACKWARD"
};

export const LOGS_DESTINATION = {
    NULL: "NULL",
    CLIENT_LOGGER: "CLIENT_LOGGER",
    DEBUG: "DEBUG"
};

export const REGIONS = {
    pdx: "us-west-2",
    iad: "us-east-1",
    syd: "ap-southeast-2",
    nrt: "ap-northeast-1",
    fra: "eu-central-1",
    pdt: "us-gov-west-1",
    yul: "ca-central-1",
    icn: "ap-northeast-2",
    cpt: "af-south-1"
};

export const AGENT_RECONNECT_CONFIG = {
    interval: 3000,
    maxRetries: 5
};

export const CUSTOMER_RECONNECT_CONFIG = {
    interval: 3000,
    maxRetries: 5
};

export const CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS = 1000 * 60 * 60 * 12; // 12 hours

export const CONNECTION_TOKEN_EXPIRY_BUFFER_IN_MS = 60 * 1000; //1 min

export const TRANSPORT_LIFETIME_IN_SECONDS = 3540; // 59 mins

export const SEND_EVENT_CONACK_THROTTLED = "SEND_EVENT_CONACK_THROTTLED";
export const CREATE_PARTICIPANT_CONACK_FAILURE = "CREATE_PARTICIPANT_CONACK_FAILURE";
export const SEND_EVENT_CONACK_FAILURE = "SEND_EVENT_CONACK_FAILURE";
export const CREATE_PARTICIPANT_CONACK_API_CALL_COUNT = "CREATE_PARTICIPANT_CONACK_CALL_COUNT";

export const TYPING_VALIDITY_TIME = 10000;

export const DUMMY_ENDED_EVENT = {
    AbsoluteTime: "",
    ContentType: "application/vnd.amazonaws.connect.event.chat.ended",
    Id: "",
    Type: "EVENT",
    InitialContactId: ""
};
