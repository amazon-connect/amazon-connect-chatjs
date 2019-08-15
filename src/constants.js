import Utils from "./utils";
//Placeholder
export const CHAT_CONFIGURATIONS = {
  CONCURRENT_CHATS: 10
};

export const CONNECTION_TOKEN_KEY = "x-amzn-connect-connection-token";
export const PARTICIPANT_TOKEN_KEY = "x-amzn-connect-participant-token";

export const RESOURCE_PATH = {
  MESSAGE: "/contact/chat/participant/message",
  TRANSCRIPT: "/contact/chat/participant/transcript",
  EVENT: "/contact/chat/participant/event",
  DISCONNECT: "/contact/chat/participant/disconnect",
  CONNECTION_DETAILS: "/contact/chat/participant/connection-details"
};

export const HTTP_METHODS = {
  POST: "post"
};

export const MESSAGE_PERSISTENCE = {
  PERSISTED: "PERSISTED",
  NON_PERSISTED: "NON_PERSISTED"
};

export const CONTENT_TYPE = {
  textPlain: "text/plain"
};

export const VISIBILITY = Utils.makeEnum([
  "ALL",
  "MANAGER",
  "AGENT",
  "CUSTOMER",
  "THIRDPARTY"
]);

export const PERSISTENCE = Utils.makeEnum(["PERSISTED", "NON_PERSISTED"]);

export const REGION_CONFIG = {
  "us-west-2": {
    invokeUrl: "https://eap1w93j0k.execute-api.us-west-2.amazonaws.com/prod"
  },
  "us-east-1": {
    invokeUrl: "https://4agcjusx3k.execute-api.us-east-1.amazonaws.com/prod"
  },
  "ap-southeast-2": {
    invokeUrl:
      "https://v4u8oq0cve.execute-api.ap-southeast-2.amazonaws.com/prod"
  },
  "ap-northeast-1": {
    invokeUrl:
      "https://3fidunfyz7.execute-api.ap-northeast-1.amazonaws.com/prod"
  },
  "eu-central-1": {
    invokeUrl: "https://1gynaarm3e.execute-api.eu-central-1.amazonaws.com/prod"
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
  CONNECTION_BROKEN: "CONNECTION_BROKEN"
};

export const TRANSCRIPT_DEFAULT_PARAMS = {
  MAX_RESULTS: 15,
  SORT_KEY: "ASCENDING",
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
