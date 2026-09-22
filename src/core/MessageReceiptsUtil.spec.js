import MessageReceiptsUtil from "./MessageReceiptsUtil";
import { CHAT_EVENTS, CONTENT_TYPE } from "../constants";

jest.mock("../log", () => ({
    LogManager: {
        getLogger: () => console
    }
}));
describe("MessageReceiptsUtil", () => {
    const messageReceiptsUtil = new MessageReceiptsUtil({});
    test("should initialize MessageReceiptsUtil correctly", () => {
        expect(messageReceiptsUtil.logger).toBeDefined();
        expect(messageReceiptsUtil.timeout).toBeNull();
        expect(messageReceiptsUtil.timeoutId).toBeNull();
        expect(messageReceiptsUtil.readMap).not.toBeNull();
        expect(messageReceiptsUtil.deliveredMap).not.toBeNull();
        expect(messageReceiptsUtil.readPromiseMap).not.toBeNull();
        expect(messageReceiptsUtil.readPromiseMap).not.toBeNull();
    });

    test("should return true if messageType Read or Delivered receipt", () => {
        expect(messageReceiptsUtil.isMessageReceipt("INCOMING_READ_RECEIPT")).toBeTruthy();
        expect(messageReceiptsUtil.isMessageReceipt("INCOMING_DELIVERED_RECEIPT")).toBeTruthy();
        expect(messageReceiptsUtil.isMessageReceipt("", { Type: "MESSAGEMETADATA" })).toBeTruthy();
    });

    test("should return true if currentParticipantId not equal to recipientId", () => {
        expect(messageReceiptsUtil.shouldShowMessageReceiptForCurrentParticipantId("p1", {
            MessageMetadata: {
                Receipts: [{
                    RecipientParticipantId: "p2"
                }]
            }
        })).toBeTruthy();
        expect(messageReceiptsUtil.shouldShowMessageReceiptForCurrentParticipantId("p2", {
            MessageMetadata: {
                Receipts: [{
                    RecipientParticipantId: "p2"
                }]
            }
        })).toBeFalsy();
    });
    test("should throttle and catch error if callback fails", (done) => {
        jest.useRealTimers();
        const customError = new Error("Test");
        const callback = jest.fn().mockImplementation(() => {
            throw customError;
        });
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"messageId222"}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000)
            .then((res) => console.log("resolve", res))
            .catch(err => {
                expect(err).toEqual(customError);
                done();
            });
    });
    test("should not throttle if throttling is disabled for the event", (done) => {
        jest.useRealTimers();
        const callback = jest.fn().mockImplementation(() => Promise.resolve("event_processed"));
        const p1 = messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"messageId2221", "disableThrottle": true}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000);
        const p2 = messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"messageId2221", "disableThrottle": true}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000);
        const p3 = messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token", 
            CONTENT_TYPE.readReceipt, `{}`, 
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000);
        Promise.all([p1,p2,p3]).then(res => {
            expect(res[0]).toEqual("event_processed");
            expect(res[1]).toEqual({
                message: 'Event already fired'
            });
            expect(res[2]).toEqual({
                message: 'Event already fired'
            });
            done();
        });
    });
    test("should throttle and call callback once", async () => {
        jest.useRealTimers();
        const callback = jest.fn();
        const args = ["token", CONTENT_TYPE.deliveredReceipt,
            `{"messageId":"messageId11"}`, CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000];
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        await messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"messageId21"}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000);
        expect(callback).toHaveBeenCalledTimes(1);

        await messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.deliveredReceipt, `{"messageId":"messageId21"}`,
            CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000);
        expect(callback).toHaveBeenCalledTimes(1);
    });
    test("should throttle and call callback twice", (done) => {
        jest.useRealTimers();
        const callback = jest.fn().mockImplementation(() => Promise.resolve("test"));
        const args = ["token", CONTENT_TYPE.deliveredReceipt,
            `{"messageId":"message1"}`, CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000];
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"message2"}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000).then(() => {
            setTimeout(() => {
                messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
                    CONTENT_TYPE.readReceipt, `{"messageId":"message22"}`,
                    CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000).then(() => {
                    expect(callback).toHaveBeenCalledTimes(2);
                    done();
                });
            }, 1500);
        });
    });
    test("should throttle and call callback thrice", (done) => {
        jest.useRealTimers();
        const callback = jest.fn().mockImplementation(() => Promise.resolve("test"));
        const args = ["token", CONTENT_TYPE.deliveredReceipt,
            `{"messageId":"mess1"}`, CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000];
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
        messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
            CONTENT_TYPE.readReceipt, `{"messageId":"mess2"}`,
            CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000).then(() => {
            setTimeout(() => {
                messageReceiptsUtil.throttleInitialEventsToPrioritizeRead();
                messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, ...args);
                messageReceiptsUtil.readSet.add("mess1");
                messageReceiptsUtil.throttleInitialEventsToPrioritizeRead();
                Promise.all([
                    messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
                        CONTENT_TYPE.readReceipt, `{"messageId":"mess3"}`,
                        CHAT_EVENTS.INCOMING_READ_RECEIPT, 1000),
                    messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
                        CONTENT_TYPE.deliveredReceipt, `{"messageId":"mess4"}`,
                        CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000),
                    messageReceiptsUtil.prioritizeAndSendMessageReceipt(this, callback, "token",
                        CONTENT_TYPE.deliveredReceipt, `{"messageId":"mess5"}`,
                        CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT, 1000)]).then(() => {
                    expect(callback).toHaveBeenCalledTimes(3);
                    done();
                });
            }, 1500);
        });
    });

    test("should rehydrate mappers", () => {
        const callback = jest.fn();
        const response = {
            data: {
                Transcript: [{
                    "Id": "sampleId3",
                    "Type": "MESSAGEMETADATA",
                    "MessageMetadata": {
                        "MessageId": "messageIdABC",
                        "Receipts": [
                            {
                                "DeliverTimestamp": "2022-06-25T00:09:15.864Z",
                                "ReadTimestamp": "2022-06-25T00:09:18.864Z",
                                "RecipientParticipantId": "participantDEF",
                            }
                        ]
                    }
                }]
            }
        };
        messageReceiptsUtil.rehydrateReceiptMappers(callback, true)(response);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith(response);
    });
    test("should return an error", async () => {
        const callback = jest.fn();
        const context = null;
        try {
            const returnVal = await messageReceiptsUtil.prioritizeAndSendMessageReceipt.call(context, callback, {});
            console.log("returnVal", returnVal);
            expect(returnVal).toEqual({
                "args": [],
                "message": "Failed to send messageReceipt",
            });
        } catch (err) {
            expect(err).toEqual({
                "args": [],
                "message": "Failed to send messageReceipt",
            });
        }
    });
});