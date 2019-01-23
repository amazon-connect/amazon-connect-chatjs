/*eslint no-unused-vars: "off"*/
import { ChatSessionConstructor } from "./core/chatSession";
import { CHAT_EVENTS, SESSION_TYPES } from "./constants";

connect = global.connect || {};
global.connect = connect;
connect.ChatSession = ChatSessionConstructor;

export const chatSession = ChatSessionConstructor;
export const ChatEvents = CHAT_EVENTS;
export const SessionTypes = SESSION_TYPES;
