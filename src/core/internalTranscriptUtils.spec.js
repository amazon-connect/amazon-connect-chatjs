import InternalTranscriptUtils from "./internalTranscriptUtils";
import { MESSAGE_STATUS } from "../constants";

describe("InternalTranscriptUtils", () => {
    let utils;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            warn: jest.fn()
        };
        utils = new InternalTranscriptUtils(mockLogger);
    });

    describe("handleSendMessage", () => {
        it("should create temp message with SENDING status", () => {
            const args = {
                contentType: "text/plain",
                message: "Hello"
            };

            const tempId = utils.handleSendMessage(args);

            expect(tempId).toBeDefined();
            expect(utils.transcriptDict[tempId]).toEqual({
                Id: tempId,
                ContentType: "text/plain",
                Content: "Hello",
                Type: "MESSAGE",
                ParticipantRole: "CUSTOMER",
                AbsoluteTime: "",
                MessageMetadata: { MessageId: tempId, Status: MESSAGE_STATUS.SENDING }
            });
            expect(utils.transcriptItems).toHaveLength(1);
            expect(utils.transcriptItems[0].Id).toBe(tempId);
        });

        it("should return null on error", () => {
            const args = null;
            const tempId = utils.handleSendMessage(args);

            expect(tempId).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalled();
        });
    });

    describe("handleSendMessageSuccess", () => {
        it("should update temp message with real ID", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            const tempId = utils.handleSendMessage(args);
            const realId = "real-id-123";

            utils.handleSendMessageSuccess(tempId, realId);

            expect(utils.transcriptDict[tempId]).toBeUndefined();
            expect(utils.transcriptDict[realId]).toBeDefined();
            expect(utils.transcriptDict[realId].Id).toBe(realId);
            expect(utils.transcriptDict[realId].MessageMetadata.Status).toBe(MESSAGE_STATUS.SENT);
            expect(utils.tempMessageIdMap[tempId]).toBe(realId);
        });

        it("should remove temp message if real message already exists", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            const tempId = utils.handleSendMessage(args);
            const realId = "real-id-123";

            // Add real message first
            utils.transcriptDict[realId] = {
                Id: realId,
                Content: "Hello",
                ContentType: "text/plain"
            };

            utils.handleSendMessageSuccess(tempId, realId);

            expect(utils.transcriptDict[tempId]).toBeUndefined();
            expect(utils.transcriptItems.find(t => t.Id === tempId)).toBeUndefined();
        });

        it("should handle missing temp message gracefully", () => {
            utils.handleSendMessageSuccess("non-existent", "real-id");
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });

    describe("handleSendMessageFailure", () => {
        it("should update message status to FAILED", () => {
            const args = { contentType: "text/plain", message: "Hello" };
            const tempId = utils.handleSendMessage(args);

            utils.handleSendMessageFailure(tempId);

            expect(utils.transcriptDict[tempId].MessageMetadata.Status).toBe(MESSAGE_STATUS.FAILED);
            expect(utils.transcriptDict[tempId].AbsoluteTime).toBeDefined();
        });

        it("should handle missing temp message gracefully", () => {
            utils.handleSendMessageFailure("non-existent");
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });

    describe("handleIncomingItem", () => {
        it("should add new item to transcript", () => {
            const item = {
                Id: "msg-1",
                Content: "Hello",
                ContentType: "text/plain",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            utils.handleIncomingItem(item);

            expect(utils.transcriptDict["msg-1"]).toMatchObject({
                Id: item.Id,
                Content: item.Content,
                ContentType: item.ContentType,
                AbsoluteTime: item.AbsoluteTime
            });
            expect(utils.transcriptDict["msg-1"].serializedContent).toBeDefined();
            expect(utils.transcriptItems).toHaveLength(1);
        });

        it("should handle item without Id gracefully", () => {
            const item = { Content: "Hello" };
            utils.handleIncomingItem(item);

            expect(Object.keys(utils.transcriptDict)).toHaveLength(0);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });

    describe("handleGetTranscriptResponse", () => {
        it("should add transcript items and store nextToken", () => {
            const transcript = [
                { Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" },
                { Id: "msg-2", Content: "World", AbsoluteTime: "2024-01-01T00:00:01.000Z" }
            ];
            const nextToken = "token-123";

            utils.handleGetTranscriptResponse(transcript, nextToken, "BACKWARD");

            expect(utils.transcriptItems).toHaveLength(2);
            expect(utils.previousTranscriptNextToken).toBe(nextToken);
        });

        it("should not store nextToken for FORWARD scan", () => {
            const transcript = [{ Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" }];
            
            utils.handleGetTranscriptResponse(transcript, "token-123", "FORWARD");

            expect(utils.previousTranscriptNextToken).toBeNull();
        });

        it("should handle null transcript gracefully", () => {
            utils.handleGetTranscriptResponse(null, "token", "BACKWARD");
            expect(utils.transcriptItems).toHaveLength(0);
        });
    });

    describe("addOrUpdate", () => {
        it("should add new item to end of transcript", () => {
            const item = {
                Id: "msg-1",
                Content: "Hello",
                AbsoluteTime: "2024-01-01T00:00:00.000Z"
            };

            utils.addOrUpdate(item);

            expect(utils.transcriptItems).toHaveLength(1);
            expect(utils.transcriptItems[0]).toEqual(item);
        });

        it("should update existing item in place", () => {
            const item1 = { Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            const item2 = { Id: "msg-1", Content: "Hello Updated", AbsoluteTime: "2024-01-01T00:00:00.000Z" };

            utils.addOrUpdate(item1);
            utils.addOrUpdate(item2);

            expect(utils.transcriptItems).toHaveLength(1);
            expect(utils.transcriptItems[0].Content).toBe("Hello Updated");
        });

        it("should add SENDING messages at end", () => {
            const item1 = { Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            const item2 = {
                Id: "msg-2",
                Content: "Sending",
                AbsoluteTime: "",
                MessageMetadata: { Status: MESSAGE_STATUS.SENDING }
            };

            utils.addOrUpdate(item1);
            utils.addOrUpdate(item2);

            expect(utils.transcriptItems).toHaveLength(2);
            expect(utils.transcriptItems[1].Id).toBe("msg-2");
        });

        it("should prepend older messages", () => {
            const item1 = { Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:02.000Z" };
            const item2 = { Id: "msg-2", Content: "World", AbsoluteTime: "2024-01-01T00:00:01.000Z" };

            utils.addOrUpdate(item1);
            utils.addOrUpdate(item2);

            expect(utils.transcriptItems).toHaveLength(2);
            expect(utils.transcriptItems[0].Id).toBe("msg-2");
            expect(utils.transcriptItems[1].Id).toBe("msg-1");
        });
    });

    describe("getTranscriptData", () => {
        it("should return transcript copy and nextToken", () => {
            const item = { Id: "msg-1", Content: "Hello", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(item);
            utils.previousTranscriptNextToken = "token-123";

            const data = utils.getTranscriptData();

            expect(data.transcript).toHaveLength(1);
            expect(data.transcript[0]).toEqual(item);
            expect(data.previousTranscriptNextToken).toBe("token-123");
            expect(data.transcript).not.toBe(utils.transcriptItems);
        });
    });

    describe("createTranscriptItem", () => {
        it("should add serializedContent to item", () => {
            const rawItem = { Id: "msg-1", Content: "Hello", Type: "MESSAGE" };
            const item = utils.createTranscriptItem(rawItem);

            expect(item.serializedContent).toBeDefined();
            expect(JSON.parse(item.serializedContent)).toEqual(rawItem);
        });
    });

    describe("handleMessageReceipt", () => {
        it("should update message status to DELIVERED", () => {
            const message = { Id: "msg-1", Content: "Hello", Type: "MESSAGE", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(message);

            const receipt = { DeliveredTimestamp: "2024-01-01T00:00:01.000Z" };
            utils.handleMessageReceipt("msg-1", receipt);

            expect(utils.transcriptDict["msg-1"].MessageMetadata.Status).toBe(MESSAGE_STATUS.DELIVERED);
        });

        it("should update message status to READ", () => {
            const message = { Id: "msg-1", Content: "Hello", Type: "MESSAGE", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(message);

            const receipt = { ReadTimestamp: "2024-01-01T00:00:02.000Z" };
            utils.handleMessageReceipt("msg-1", receipt);

            expect(utils.transcriptDict["msg-1"].MessageMetadata.Status).toBe(MESSAGE_STATUS.READ);
        });

        it("should prioritize READ over DELIVERED", () => {
            const message = { Id: "msg-1", Content: "Hello", Type: "MESSAGE", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(message);

            const receipt = { DeliveredTimestamp: "2024-01-01T00:00:01.000Z", ReadTimestamp: "2024-01-01T00:00:02.000Z" };
            utils.handleMessageReceipt("msg-1", receipt);

            expect(utils.transcriptDict["msg-1"].MessageMetadata.Status).toBe(MESSAGE_STATUS.READ);
        });

        it("should not update non-MESSAGE items", () => {
            const event = { Id: "evt-1", Type: "EVENT", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(event);

            const receipt = { DeliveredTimestamp: "2024-01-01T00:00:01.000Z" };
            utils.handleMessageReceipt("evt-1", receipt);

            expect(utils.transcriptDict["evt-1"].MessageMetadata).toBeUndefined();
        });

        it("should handle non-existent message gracefully", () => {
            const receipt = { DeliveredTimestamp: "2024-01-01T00:00:01.000Z" };
            utils.handleMessageReceipt("non-existent", receipt);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });

    describe("handleMessageMetadata", () => {
        it("should process MESSAGE_METADATA item", () => {
            const message = { Id: "msg-1", Content: "Hello", Type: "MESSAGE", AbsoluteTime: "2024-01-01T00:00:00.000Z" };
            utils.addOrUpdate(message);

            const metadata = {
                Id: "meta-1",
                Type: "MESSAGEMETADATA",
                MessageMetadata: {
                    MessageId: "msg-1",
                    Receipts: [{ DeliveredTimestamp: "2024-01-01T00:00:01.000Z" }]
                }
            };
            utils.handleMessageMetadata(metadata);

            expect(utils.transcriptDict["msg-1"].MessageMetadata.Status).toBe(MESSAGE_STATUS.DELIVERED);
        });

        it("should handle missing MessageId gracefully", () => {
            const metadata = {
                Id: "meta-1",
                Type: "MESSAGEMETADATA",
                MessageMetadata: { Receipts: [{ DeliveredTimestamp: "2024-01-01T00:00:01.000Z" }] }
            };
            utils.handleMessageMetadata(metadata);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it("should handle missing Receipts gracefully", () => {
            const metadata = {
                Id: "meta-1",
                Type: "MESSAGEMETADATA",
                MessageMetadata: { MessageId: "msg-1" }
            };
            utils.handleMessageMetadata(metadata);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
