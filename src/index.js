/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";
import { LogManager, LogLevel } from "./log";

var global = typeof global !== 'undefined' ? global :
    typeof self !== 'undefined' ? self :
        typeof window !== 'undefined' ? window : {};
global.connect = global.connect || {};
connect.ChatSession = ChatSessionObject;
connect.LogManager = LogManager;
connect.LogLevel = LogLevel;
connect.csmService = ChatSessionObject.csmService;
export const ChatSession = ChatSessionObject;
