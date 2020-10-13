/*eslint no-unused-vars: "off"*/
import { ChatSessionObject } from "./core/chatSession";

console.log('WOOOOOOAH');

global.connect = global.connect || {};
connect.ChatSession = ChatSessionObject;
export const ChatSession = ChatSessionObject;
