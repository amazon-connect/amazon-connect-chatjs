/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";
import { CHAT_EVENTS, SESSION_TYPES } from "./constants";

global.connect = global.connect || {};
connect.ChatSession = ChatSessionObject;
connect.ChatEvents = CHAT_EVENTS;
connect.SessionTypes = SESSION_TYPES;

export const ChatSession = ChatSessionObject;
export const ChatEvents = CHAT_EVENTS;
export const SessionTypes = SESSION_TYPES;
