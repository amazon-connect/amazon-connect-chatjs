/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";
import { LogManager, LogLevel } from "./log";

var global = typeof global !== 'undefined' ? global :
    typeof self !== 'undefined' ? self :
        typeof window !== 'undefined' ? window : {};
/**
 * connect is a shared namespace used by Streams SDK,
 * so any property added to connect namespace overrides
 * Streams SDK. Since Streams is initialized before ChatJS,
 * adding optionals here so Streams SDK namespace is not overridden.
 *  */
global.connect = global.connect || {};
connect.ChatSession = connect.ChatSession || ChatSessionObject;
connect.LogManager = connect.LogManager || LogManager;
connect.LogLevel = connect.LogLevel || LogLevel;
connect.csmService = connect.csmService || ChatSessionObject.csmService;
export const ChatSession = ChatSessionObject;
