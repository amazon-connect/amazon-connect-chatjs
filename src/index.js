/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";
import { LogManager, LogLevel } from "./log";
var global = this || window;
var connect = global.connect || {};
global.connect = connect;
connect.ChatSession = ChatSessionObject;
connect.LogManager = LogManager;
connect.LogLevel = LogLevel;
export const ChatSession = ChatSessionObject;
