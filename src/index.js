/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";

global.connect = global.connect || {};
connect.ChatSession = ChatSessionObject;

export const ChatSession = ChatSessionObject;
