import { CHAT_EVENTS, TRANSCRIPT_ACTIONS } from "../constants";
import { ChatController } from "./chatController";
import { jest } from "@jest/globals";
import Utils from "../utils";

jest.mock("./connectionHelpers/LpcConnectionHelper");
jest.mock("./connectionHelpers/connectionDetailsProvider");
jest.mock("../log", () => ({
    LogManager: {
        getLogger: () => console
    }
}));

import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import connectionDetailsProvider from "./connectionHelpers/connectionDetailsProvider";

describe("ChatController - Transcript Updates", () => {
    let chatController;
    let mockChatClient;

    beforeEach(() => {
        jest.resetAllMocks();
        
        connectionDetailsProvider.mockImplementation(() => {
            return {
                fetchConnectionDetails: () => {
                    return Promise.resolve({
                        url: "url",
                        expiry: "expiry",
                        connectionToken: "token"
                    });
                },
                callCreateParticipantConnection: () => Promise.resolve("connAck"),
                getConnectionDetails: () => {},
            };
        });
        
        LpcConnectionHelper.mockImplementation(() => {
            return {
                onEnded: () => {},
                onConnectionLost: () => {},
                onConnectionGain: () => {},
                onDeepHeartbeatSuccess: () => {},
                onDeepHeartbeatFailure: () => {},
                onBackgroundChatEnded: () => {},
                onMessage: () => {},
                start: () => Promise.resolve(),
                end: () => Promise.resolve(),
                getStatus: () => "Connected",
                getConnectionToken: () => "token",
            };
        });
        
        mockChatClient = {
            sendMessage: jest.fn(() => Promise.resolve({ data: { Id: "real-id-123", AbsoluteTime: "2024-01-01T00:00:00.000Z" } })),
            getTranscript: jest.fn(() => Promise.resolve({
                data: {
                    Transcript: [
                        { Id: "msg-1", Content: "Hello", ContentType: "text/plain", AbsoluteTime: "2024-01-01T00:00:00.000Z" }
                    ],
                    NextToken: "token-123"
                }
            })),
            disconnectParticipant: jest.fn(() => Promise.resolve())
        };

        chatController = new ChatController({
            sessionType: "CUSTOMER",
            chatDetails: {
                contactId: "contact-123",
                participantId: "participant-123",
                participantToken: "token-123"
            },
            chatClient: mockChatClient
        });
    });

    describe("subscribe to TRANSCRIPT_UPDATED", () => {
        it("should enable transcript updates when subscribing to TRANSCRIPT_UPDATED event", () => {
            expect(chatController.transcriptUpdateEnabled).toBe(false);

            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, handler);

            expect(chatController.transcriptUpdateEnabled).toBe(true);
        });

        it("should not enable transcript updates for other events", () => {
            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.INCOMING_MESSAGE, handler);

            expect(chatController.transcriptUpdateEnabled).toBe(false);
        });
    });

    describe("_updateTranscript", () => {
        beforeEach(() => {
            chatController.transcriptUpdateEnabled = true;
        });

        it("should handle sendMessage action", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE, args);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript).toHaveLength(1);
            expect(transcriptData.transcript[0].Content).toBe("Hello");
        });

        it("should handle sendMessageSuccess action", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE, args);

            const tempId = chatController.internalTranscriptUtils.transcriptItems[0].Id;
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE_SUCCESS, { tempId, realId: "real-123" });

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript[0].Id).toBe("real-123");
        });

        it("should handle sendMessageFailure action", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE, args);

            const tempId = chatController.internalTranscriptUtils.transcriptItems[0].Id;
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE_FAILURE, { tempId });

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript[0].MessageMetadata.Status).toBe("FAILED");
        });

        it("should handle getTranscript action", () => {
            const response = {
                data: {
                    Transcript: [{ Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" }],
                    NextToken: "token-123"
                }
            };
            const scanDirection = "BACKWARD";

            chatController._updateTranscript(TRANSCRIPT_ACTIONS.GET_TRANSCRIPT, { response, scanDirection });

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript).toHaveLength(1);
            expect(transcriptData.previousTranscriptNextToken).toBe("token-123");
        });

        it("should handle incomingMessage action", () => {
            const item = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            chatController._updateTranscript(TRANSCRIPT_ACTIONS.INCOMING_MESSAGE, item);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript).toHaveLength(1);
            expect(transcriptData.transcript[0].Id).toBe("msg-1");
        });

        it("should not update transcript when disabled", () => {
            chatController.transcriptUpdateEnabled = false;

            const args = { contentType: "text/plain", message: "Hello" };
            chatController._updateTranscript(TRANSCRIPT_ACTIONS.SEND_MESSAGE, args);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript).toHaveLength(0);
        });

        it("should handle errors gracefully", () => {
            chatController._updateTranscript("invalidAction", {});
            // Should not throw
        });
    });

    describe("sendMessage with transcript updates", () => {
        it("should trigger TRANSCRIPT_UPDATED event after sendMessage", async () => {
            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, handler);
            await chatController.connect();
            await Utils.delay(1);

            await chatController.sendMessage({ contentType: "text/plain", message: "Hello" });
            await Utils.delay(1);

            expect(handler).toHaveBeenCalled();
            const eventData = handler.mock.calls[handler.mock.calls.length - 1][0];
            expect(eventData.data.transcript).toBeDefined();
        });
    });

    describe("getTranscript with transcript updates", () => {
        it("should trigger TRANSCRIPT_UPDATED event after getTranscript", async () => {
            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, handler);
            await chatController.connect();
            await Utils.delay(1);

            await chatController.getTranscript({});
            await Utils.delay(1);

            expect(handler).toHaveBeenCalled();
            const eventData = handler.mock.calls[0][0];
            expect(eventData.data.transcript).toBeDefined();
        });
    });

    describe("_handleIncomingMessage with transcript updates", () => {
        it("should trigger TRANSCRIPT_UPDATED event for incoming messages", async () => {
            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, handler);

            const message = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                Type: "MESSAGE",
                AbsoluteTime: "2024-01-01T00:00:00.000Z",
                ParticipantRole: "AGENT"
            };

            chatController._handleIncomingMessage(message);
            await Utils.delay(1);

            expect(handler).toHaveBeenCalled();
            const eventData = handler.mock.calls[handler.mock.calls.length - 1][0];
            expect(eventData.data.transcript).toBeDefined();
            expect(eventData.data.transcript.length).toBeGreaterThan(0);
        });
    });

    describe("transcript item structure", () => {
        beforeEach(() => {
            chatController.transcriptUpdateEnabled = true;
        });

        it("should add serializedContent to transcript items", () => {
            const item = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                Type: "MESSAGE",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            chatController._updateTranscript("incomingMessage", item);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript[0].serializedContent).toBeDefined();
            expect(JSON.parse(transcriptData.transcript[0].serializedContent)).toMatchObject(item);
        });

        it("should track delivered status from MESSAGE_METADATA", () => {
            const message = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                Type: "MESSAGE",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            chatController._updateTranscript("incomingMessage", message);

            const receipt = {
                Id: "receipt-1",
                Type: "MESSAGEMETADATA",
                MessageMetadata: {
                    MessageId: "msg-1",
                    Receipts: [{
                        DeliveredTimestamp: "2024-01-01T00:00:01.000Z"
                    }]
                }
            };

            chatController._updateTranscript("incomingMessage", receipt);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript[0].MessageMetadata.Status).toBe("DELIVERED");
        });

        it("should update status to READ when read receipt arrives", () => {
            const message = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                Type: "MESSAGE",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            chatController._updateTranscript("incomingMessage", message);

            const readReceipt = {
                Id: "receipt-2",
                Type: "MESSAGEMETADATA",
                MessageMetadata: {
                    MessageId: "msg-1",
                    Receipts: [{
                        ReadTimestamp: "2024-01-01T00:00:02.000Z"
                    }]
                }
            };

            chatController._updateTranscript("incomingMessage", readReceipt);

            const transcriptData = chatController.internalTranscriptUtils.getTranscriptData();
            expect(transcriptData.transcript[0].MessageMetadata.Status).toBe("READ");
        });
    });

    describe("auto-fetch transcript on connection", () => {
        it("should call getTranscript when connection is gained and transcriptUpdateEnabled is true", async () => {
            let onConnectionGainHandler;
            LpcConnectionHelper.mockImplementation(() => {
                return {
                    onEnded: () => {},
                    onConnectionLost: () => {},
                    onConnectionGain: (handler) => { onConnectionGainHandler = handler; },
                    onDeepHeartbeatSuccess: () => {},
                    onDeepHeartbeatFailure: () => {},
                    onBackgroundChatEnded: () => {},
                    onMessage: () => {},
                    start: () => Promise.resolve(),
                    end: () => Promise.resolve(),
                    getStatus: () => "Connected",
                    getConnectionToken: () => "token",
                };
            });

            chatController = new ChatController({
                sessionType: "CUSTOMER",
                chatDetails: {
                    contactId: "contact-123",
                    participantId: "participant-123",
                    participantToken: "token-123"
                },
                chatClient: mockChatClient
            });

            const handler = jest.fn();
            chatController.subscribe(CHAT_EVENTS.TRANSCRIPT_UPDATED, handler);
            await chatController.connect();
            await Utils.delay(1);

            onConnectionGainHandler({});
            await Utils.delay(1);

            expect(mockChatClient.getTranscript).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ maxResults: 100 })
            );
        });

        it("should not call getTranscript when transcriptUpdateEnabled is false", async () => {
            let onConnectionGainHandler;
            LpcConnectionHelper.mockImplementation(() => {
                return {
                    onEnded: () => {},
                    onConnectionLost: () => {},
                    onConnectionGain: (handler) => { onConnectionGainHandler = handler; },
                    onDeepHeartbeatSuccess: () => {},
                    onDeepHeartbeatFailure: () => {},
                    onBackgroundChatEnded: () => {},
                    onMessage: () => {},
                    start: () => Promise.resolve(),
                    end: () => Promise.resolve(),
                    getStatus: () => "Connected",
                    getConnectionToken: () => "token",
                };
            });

            chatController = new ChatController({
                sessionType: "CUSTOMER",
                chatDetails: {
                    contactId: "contact-123",
                    participantId: "participant-123",
                    participantToken: "token-123"
                },
                chatClient: mockChatClient
            });

            await chatController.connect();
            await Utils.delay(1);

            onConnectionGainHandler({});
            await Utils.delay(1);

            expect(mockChatClient.getTranscript).not.toHaveBeenCalled();
        });
    });
});
