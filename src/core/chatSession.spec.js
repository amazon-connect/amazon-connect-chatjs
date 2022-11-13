import { ChatSession, ChatSessionObject } from "./chatSession";
import { csmService } from "../service/csmService";
import { CHAT_SESSION_FACTORY } from "./chatSession";
import { ChatController } from "./chatController";
import { SESSION_TYPES, CHAT_EVENTS } from "../constants";

describe("CSM", () => {

    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(csmService, 'initializeCSM').mockImplementation(() => { });
        jest.spyOn(CHAT_SESSION_FACTORY, 'createChatSession').mockImplementation(() => { });
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    test("should initialize csm for customer sessions", async () => {
        const args = {
            type: SESSION_TYPES.CUSTOMER
        };
        ChatSessionObject.create(args);
        expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
        expect(csmService.initializeCSM).toHaveBeenCalled();
    });

    test("should not initialize csm for non-customer sessions", async () => {
        const args = {
            type: SESSION_TYPES.AGENT
        };
        ChatSessionObject.create(args);
        expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
        expect(csmService.initializeCSM).not.toHaveBeenCalled();
    });

    test("should not initialize csm when session type is missing", async () => {
        const args = {};
        ChatSessionObject.create(args);
        expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
        expect(csmService.initializeCSM).not.toHaveBeenCalled();
    });
    test("should not initialize csm when disableCSM flag is true", () => {
        const args = {disableCSM: true};
        ChatSessionObject.create(args);
        expect(CHAT_SESSION_FACTORY.createChatSession).toHaveBeenCalled();
        expect(csmService.initializeCSM).not.toHaveBeenCalled();
    });
});

describe("chatSession", () => {
    const chatDetails = {};
    let chatClient = {};
    const websocketManager = {};

    function getChatController() {
        return new ChatController({
            sessionType: SESSION_TYPES.AGENT,
            chatDetails: chatDetails,
            chatClient: chatClient,
            websocketManager: websocketManager,
        });
    }
    const controller = getChatController();
    const session = new ChatSession(controller);
    test('event listener', async () => {
        const eventData = {
            data: "",
            chatDetails
        };
        const cb1 = jest.fn();
        const cb2 = jest.fn();
        const cb3 = jest.fn();
        const cb4 = jest.fn();
        const cb5 = jest.fn();
        const cb6 = jest.fn();
        const cb7 = jest.fn();
        const cb8 = jest.fn();
        const cb9 = jest.fn();
        const cb10 = jest.fn();

        session.onParticipantIdle(cb1);
        session.onParticipantReturned(cb2);
        session.onAutoDisconnection(cb3);
        session.onMessage(cb4);
        session.onTyping(cb5);
        session.onReadReceipt(cb6);
        session.onDeliveredReceipt(cb7);
        session.onConnectionBroken(cb8);
        session.onConnectionEstablished(cb9);
        session.onEnded(cb10);

        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_IDLE, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_RETURNED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTODISCONNECTION, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_MESSAGE, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_TYPING, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_READ_RECEIPT, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CONNECTION_BROKEN, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CONNECTION_ESTABLISHED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, eventData);

        await new Promise((r) => setTimeout(r, 0));

        expect(cb1).toHaveBeenCalled();
        expect(cb2).toHaveBeenCalled();
        expect(cb3).toHaveBeenCalled();
        expect(cb4).toHaveBeenCalled();
        expect(cb5).toHaveBeenCalled();
        expect(cb6).toHaveBeenCalled();
        expect(cb7).toHaveBeenCalled();
        expect(cb8).toHaveBeenCalled();
        expect(cb9).toHaveBeenCalled();
        expect(cb10).toHaveBeenCalled();
    });

    test('events', () => {
        const args = {};
        jest.spyOn(controller, 'sendMessage').mockImplementation(() => {});
        jest.spyOn(controller, 'sendAttachment').mockImplementation(() => {});
        jest.spyOn(controller, 'downloadAttachment').mockImplementation(() => {});
        jest.spyOn(controller, 'connect').mockImplementation(() => {});
        jest.spyOn(controller, 'sendEvent').mockImplementation(() => {});
        jest.spyOn(controller, 'getTranscript').mockImplementation(() => {});
        jest.spyOn(controller, 'getChatDetails').mockImplementation(() => {});

        session.sendMessage(args);
        expect(controller.sendMessage).toHaveBeenCalled();
        session.sendAttachment(args);
        expect(controller.sendAttachment).toHaveBeenCalled();
        session.downloadAttachment(args);
        expect(controller.downloadAttachment).toHaveBeenCalled();
        session.connect(args);
        expect(controller.connect).toHaveBeenCalled();
        session.sendEvent(args);
        expect(controller.sendEvent).toHaveBeenCalled();
        session.getTranscript(args);
        expect(controller.getTranscript).toHaveBeenCalled();
        session.getChatDetails(args);
        expect(controller.getChatDetails).toHaveBeenCalled();
    });
});