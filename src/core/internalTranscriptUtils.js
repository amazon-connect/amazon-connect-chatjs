import { MESSAGE_STATUS, CHAT_EVENTS, MESSAGE } from "../constants";
import { v4 as uuidv4 } from 'uuid';

class InternalTranscriptUtils {
    constructor(logger) {
        this.logger = logger;
        this.transcriptDict = {};
        this.transcriptItems = [];
        this.previousTranscriptNextToken = null;
        this.tempMessageIdMap = {};
    }

    /**
     * Creates a transcript item with serialized content for debugging and compatibility.
     * @param {Object} rawItem - The raw transcript item
     * @returns {Object} Transcript item with serializedContent field added
     */
    createTranscriptItem(rawItem) {
        return {
            ...rawItem,
            serializedContent: JSON.stringify(rawItem)
        };
    }

    /**
     * Handles outgoing message by creating a temporary message with SENDING status.
     * @param {Object} args - Message arguments containing contentType and message
     * @returns {string|null} Temporary message ID or null on error
     */
    handleSendMessage(args) {
        try {
            const tempId = uuidv4();
            const tempMessage = {
                Id: tempId,
                ContentType: args.contentType,
                Content: args.message,
                Type: MESSAGE,
                ParticipantRole: "CUSTOMER",
                AbsoluteTime: "",
                MessageMetadata: { MessageId: tempId, Status: MESSAGE_STATUS.SENDING }
            };
            this.addOrUpdate(tempMessage);
            return tempId;
        } catch (e) {
            this.logger.warn("Error in handleSendMessage:", e);
            return null;
        }
    }

    /**
     * Updates temporary message with real ID after successful send.
     * Removes temp message if real message already exists from server.
     * @param {string} tempId - Temporary message ID
     * @param {string} realId - Real message ID from server
     */
    handleSendMessageSuccess(tempId, realId) {
        try {
            const tempMessage = this.transcriptDict[tempId];
            if (!tempMessage) return;

            if (this.transcriptDict[realId]) {
                delete this.transcriptDict[tempId];
                this.transcriptItems = this.transcriptItems.filter(t => t.Id !== tempId);
            } else {
                tempMessage.Id = realId;
                tempMessage.MessageMetadata.MessageId = realId;
                tempMessage.MessageMetadata.Status = MESSAGE_STATUS.SENT;
                delete this.transcriptDict[tempId];
                this.transcriptDict[realId] = tempMessage;
                const index = this.transcriptItems.findIndex(t => t.Id === tempId);
                if (index !== -1) this.transcriptItems[index] = tempMessage;
                this.tempMessageIdMap[tempId] = realId;
            }
        } catch (e) {
            this.logger.warn("Error in handleSendMessageSuccess:", e);
        }
    }

    /**
     * Updates message status to FAILED when send fails.
     * @param {string} tempId - Temporary message ID
     */
    handleSendMessageFailure(tempId) {
        try {
            const tempMessage = this.transcriptDict[tempId];
            if (!tempMessage) return;
            tempMessage.MessageMetadata.Status = MESSAGE_STATUS.FAILED;
            tempMessage.AbsoluteTime = new Date().toISOString();
            this.addOrUpdate(tempMessage);
        } catch (e) {
            this.logger.warn("Error in handleSendMessageFailure:", e);
        }
    }

    /**
     * Updates message status based on receipt data (READ or DELIVERED).
     * @param {string} messageId - Message ID to update
     * @param {Object} receipt - Receipt object with ReadTimestamp or DeliveredTimestamp
     */
    handleMessageReceipt(messageId, receipt) {
        const status = receipt.ReadTimestamp ? MESSAGE_STATUS.READ : 
                     receipt.DeliveredTimestamp ? MESSAGE_STATUS.DELIVERED : null;
        if (!status) return;

        const existingMessage = this.transcriptDict[messageId];
        if (existingMessage && existingMessage.Type === MESSAGE) {
            existingMessage.MessageMetadata = existingMessage.MessageMetadata || {};
            existingMessage.MessageMetadata.Status = status;
            this.addOrUpdate(existingMessage);
        }
    }

    /**
     * Processes MESSAGE_METADATA items to update message status.
     * Does not add MESSAGE_METADATA to transcript array.
     * @param {Object} item - MESSAGE_METADATA item
     */
    handleMessageMetadata(item) {
        const messageId = item.MessageMetadata?.MessageId;
        const receipt = item.MessageMetadata?.Receipts?.[0];
        if (messageId && receipt) {
            this.handleMessageReceipt(messageId, receipt);
        }
    }

    /**
     * Handles incoming transcript items from WebSocket or getTranscript.
     * Routes MESSAGE_METADATA to handleMessageMetadata, adds other items to transcript.
     * @param {Object} item - Incoming transcript item
     */
    handleIncomingItem(item) {
        try {
            if (!item?.Id) return;

            if (item.Type === CHAT_EVENTS.MESSAGE_METADATA || item.Type === "MESSAGE_METADATA") {
                this.handleMessageMetadata(item);
                return;
            }

            const transcriptItem = this.createTranscriptItem(item);
            this.addOrUpdate(transcriptItem);
        } catch (e) {
            this.logger.warn("Error in handleIncomingItem:", e);
        }
    }

    /**
     * Processes getTranscript response and stores nextToken for pagination.
     * @param {Array} transcript - Array of transcript items
     * @param {string} nextToken - Token for fetching next page
     * @param {string} scanDirection - BACKWARD or FORWARD
     */
    handleGetTranscriptResponse(transcript, nextToken, scanDirection) {
        try {
            if (!transcript) return;
            transcript.forEach(item => {
                const transcriptItem = this.createTranscriptItem(item);
                this.addOrUpdate(transcriptItem);
            });
            if (scanDirection === "BACKWARD") {
                this.previousTranscriptNextToken = nextToken;
            }
        } catch (e) {
            this.logger.warn("Error in handleGetTranscriptResponse:", e);
        }
    }

    /**
     * Adds new item or updates existing item in transcript.
     * Maintains chronological order: older messages prepended, newer appended.
     * SENDING messages always added at end.
     * @param {Object} item - Transcript item to add or update
     */
    addOrUpdate(item) {
        try {
            if (this.transcriptDict[item.Id]) {
                this.transcriptDict[item.Id] = item;
                const index = this.transcriptItems.findIndex(t => t.Id === item.Id);
                if (index !== -1) this.transcriptItems[index] = item;
            } else {
                this.transcriptDict[item.Id] = item;
                const isSending = item.MessageMetadata?.Status === MESSAGE_STATUS.SENDING;
                if (isSending) {
                    this.transcriptItems.push(item);
                } else if (this.transcriptItems.length > 0 && item.AbsoluteTime && item.AbsoluteTime < this.transcriptItems[0].AbsoluteTime) {
                    this.transcriptItems.unshift(item);
                } else {
                    this.transcriptItems.push(item);
                }
            }
        } catch (e) {
            this.logger.warn("Error in addOrUpdate:", e);
        }
    }

    /**
     * Returns a copy of transcript data and pagination token.
     * @returns {Object} Object with transcript array and previousTranscriptNextToken
     */
    getTranscriptData() {
        return {
            transcript: [...this.transcriptItems],
            previousTranscriptNextToken: this.previousTranscriptNextToken
        };
    }
}

export default InternalTranscriptUtils;
