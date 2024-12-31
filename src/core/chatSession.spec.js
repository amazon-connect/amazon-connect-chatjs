import { ChatSession, ChatSessionObject } from "./chatSession";
import { csmService } from "../service/csmService";
import { CHAT_SESSION_FACTORY } from "./chatSession";
import { ChatController } from "./chatController";
import { SESSION_TYPES, CHAT_EVENTS } from "../constants";
import { GlobalConfig } from "../globalConfig";
describe("CSM", () => {

    beforeEach(() => {
        jest.resetAllMocks();
        jest.spyOn(csmService, 'initializeCSM').mockImplementation(() => {});
        jest.spyOn(CHAT_SESSION_FACTORY, 'createChatSession').mockImplementation(() => {});
        jest.spyOn(GlobalConfig, 'updateRegionOverride').mockImplementation(() => {});
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

    test("should call region override", async () => {
        ChatSessionObject.setRegionOverride('test');
        expect(GlobalConfig.updateRegionOverride).toHaveBeenCalled();
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
        const cb11 = jest.fn();
        const cb12 = jest.fn();
        const cb13 = jest.fn();
        const cb14 = jest.fn();
        const cb15 = jest.fn();
        const cb16 = jest.fn();
        const cb17 = jest.fn();
        const cb18 = jest.fn();
        const cb19 = jest.fn();
        const cb20 = jest.fn();
        const cb21 = jest.fn();
        const cb22 = jest.fn();

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
        session.onConnectionLost(cb11);
        session.onDeepHeartbeatSuccess(cb12);
        session.onDeepHeartbeatFailure(cb13);
        session.onAuthenticationInitiated(cb14);
        session.onChatRehydrated(cb15);
        session.onAuthenticationFailed(cb16);
        session.onAuthenticationTimeout(cb17);
        session.onAuthenticationExpired(cb18);
        session.onAuthenticationCanceled(cb19);
        session.onAuthenticationSuccessful(cb20);
        session.onParticipantDisplayNameUpdated(cb21);
        session.onParticipantInvited(cb22);
        
        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_IDLE, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_RETURNED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_INVITED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTODISCONNECTION, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_MESSAGE, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_TYPING, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_READ_RECEIPT, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CONNECTION_BROKEN, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CONNECTION_ESTABLISHED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CHAT_ENDED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CONNECTION_LOST, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.DEEP_HEARTBEAT_SUCCESS, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.DEEP_HEARTBEAT_FAILURE, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_INITIATED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_SUCCESSFUL, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_FAILED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_TIMEOUT, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_EXPIRED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.AUTHENTICATION_CANCELED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.PARTICIPANT_DISPLAY_NAME_UPDATED, eventData);
        controller._forwardChatEvent(CHAT_EVENTS.CHAT_REHYDRATED, eventData);

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
        expect(cb11).toHaveBeenCalled();
        expect(cb12).toHaveBeenCalled();
        expect(cb13).toHaveBeenCalled();
        expect(cb14).toHaveBeenCalled();
        expect(cb15).toHaveBeenCalled();
        expect(cb16).toHaveBeenCalled();
        expect(cb17).toHaveBeenCalled();
        expect(cb18).toHaveBeenCalled();
        expect(cb19).toHaveBeenCalled();
        expect(cb20).toHaveBeenCalled();
        expect(cb21).toHaveBeenCalled();
        expect(cb22).toHaveBeenCalled();
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
        jest.spyOn(controller, 'cancelParticipantAuthentication').mockImplementation(() => {});

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
        session.cancelParticipantAuthentication(args);
        expect(controller.cancelParticipantAuthentication).toHaveBeenCalled();
    });
});
