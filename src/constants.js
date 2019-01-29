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

export const STAGE_CONFIG = {
  PROD: {
    invokeUrl: "https://2me8bbt55g.execute-api.us-west-2.amazonaws.com/Stage"
    // invokeUrl: "https://vxgh3tfytg.execute-api.us-west-2.amazonaws.com/Stage"
    //below is gautam's dev url
    //invokeUrl: "https://j1ltdj6sf6.execute-api.us-west-2.amazonaws.com/Stage"
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
  CONNECTION_BROKEN: "CONNECTION_BROKEN"
};

export const TRANSCRIPT_DEFAULT_PARAMS = {
  MAX_RESULTS: 15,
  SORT_KEY: "ASCENDING",
  SCAN_DIRECTION: "BACKWARD"
};
