//Placeholder
export const CHAT_CONFIGURATIONS = {
  CONCURRENT_CHATS: 10
};

export const PARTICIPANT_TOKEN_HEADER = "x-amzn-connect-participant-token";
export const AUTH_HEADER = "X-Amz-Bearer";

export const RESOURCE_PATH = {
  CONNECTION_DETAILS: "/contact/chat/participant/connection-details",
  MESSAGE: "/participant/message",
  TRANSCRIPT: "/participant/transcript",
  EVENT: "/participant/event",
  DISCONNECT: "/participant/disconnect",
  PARTICIPANT_CONNECTION: "/participant/connection"
};

export const HTTP_METHODS = {
  POST: "post"
};

export const REGION_CONFIG = {
  "us-west-2": {
    invokeUrl: "https://participant.connect.us-west-2.amazonaws.com"
  },
  "us-east-1": {
    invokeUrl: "https://participant.connect.us-east-1.amazonaws.com"
  },
  "ap-south-1": {
    invokeUrl: "https://participant.connect.ap-south-1.amazonaws.com"
  },
  "ap-southeast-1": {
    invokeUrl: "https://participant.connect.ap-southeast-1.amazonaws.com"
  },
  "ap-southeast-2": {
    invokeUrl: "https://participant.connect.ap-southeast-2.amazonaws.com"
  },
  "ap-northeast-1": {
    invokeUrl: "https://participant.connect.ap-northeast-1.amazonaws.com"
  },
  "eu-central-1": {
    invokeUrl: "https://participant.connect.eu-central-1.amazonaws.com"
  },
  "eu-west-2": {
    invokeUrl: "https://participant.connect.eu-west-2.amazonaws.com"
  }
};

export const MQTT_CONSTANTS = {
  KEEP_ALIVE: 30,
  CONNECT_TIMEOUT: 60
};

export const SESSION_TYPES = {
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER"
};

export const CHAT_EVENTS = {
  INCOMING_MESSAGE: "INCOMING_MESSAGE",
  INCOMING_TYPING: "INCOMING_TYPING",
  CONNECTION_ESTABLISHED: "CONNECTION_ESTABLISHED",
  CONNECTION_LOST: "CONNECTION_LOST",
  CONNECTION_BROKEN: "CONNECTION_BROKEN",
  CONNECTION_ACK: "CONNECTION_ACK",
  CHAT_ENDED: "CHAT_ENDED"
};

export const CONTENT_TYPE = {
  textPlain: "text/plain",
  connectionAcknowledged: "application/vnd.amazonaws.connect.event.connection.acknowledged",
  typing: "application/vnd.amazonaws.connect.event.typing",
  participantJoined: "application/vnd.amazonaws.connect.event.participant.joined",
  participantLeft: "application/vnd.amazonaws.connect.event.participant.left",
  transferSucceeded: "application/vnd.amazonaws.connect.event.transfer.succeeded",
  transferFailed: "application/vnd.amazonaws.connect.event.transfer.failed",
  chatEnded: "application/vnd.amazonaws.connect.event.chat.ended"
};

export const EVENT = "EVENT";
export const MESSAGE = "MESSAGE";

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
  fra: "eu-central-1"
};

export const AGENT_RECONNECT_CONFIG = {
  interval: 3000,
  maxRetries: 5
};

export const CUSTOMER_RECONNECT_CONFIG = {
  interval: 3000,
  maxRetries: 5
};

export const CONNECTION_TOKEN_POLLING_INTERVAL = 1000 * 60 * 60 * 12;

export const TRANSPORT_LIFETIME_IN_SECONDS = 7140; // 119 mins
