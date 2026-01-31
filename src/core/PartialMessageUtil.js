export default class PartialMessageUtil {
    constructor() {
        this.partialMessageMap = new Map();
        this.partialMessageMapChanged = false;
    }

    isPartialMessage(incomingData) {
        return incomingData?.ParticipantRole === "SYSTEM"
            && incomingData?.Type === "MESSAGE"
            && incomingData?.MessageMetadata?.MessageCompleted !== null
            && incomingData?.MessageMetadata?.MessageCompleted !== undefined;
    }

    hasMonotonicallyIncreasingChunkNumber(incomingData) {
        const currentMessage = this.partialMessageMap.get(incomingData.Id);

        return currentMessage?.at(-1)?.MessageMetadata?.ChunkNumber
            && incomingData?.MessageMetadata?.ChunkNumber
            && incomingData?.MessageMetadata?.ChunkNumber === currentMessage.at(-1).MessageMetadata.ChunkNumber + 1;
    }

    updatePartialMessageMap(incomingData) {
        if (!this.isPartialMessage(incomingData)) {
            this.partialMessageMapChanged = false;
            return;
        }

        const currentMessage = this.partialMessageMap.get(incomingData.Id);

        // if no message with this id exists, create new entry
        if (!currentMessage && (incomingData.MessageMetadata.ChunkNumber === 1 || incomingData.MessageMetadata.MessageCompleted === true) ) {
            this.partialMessageMap.set(incomingData.Id, [incomingData]);
            this.partialMessageMapChanged = true;
        }

        // if message is completed, replace all partials with the full completed message
        else if (currentMessage && incomingData.MessageMetadata?.MessageCompleted === true) {
            let partialMessageMapUpdated = this.partialMessageMap.get(incomingData.Id).at(-1).MessageMetadata.MessageCompleted !== incomingData.MessageMetadata.MessageCompleted;
            this.partialMessageMap.set(incomingData.Id, [incomingData]);
            this.partialMessageMapChanged = partialMessageMapUpdated;
        }

        // if message arrive in monotonically increasing ChunkNumber
        else if (currentMessage
            && incomingData.MessageMetadata?.MessageCompleted === false
            && this.hasMonotonicallyIncreasingChunkNumber(incomingData)) {

            currentMessage.push(incomingData);
            this.partialMessageMap.set(incomingData.Id, currentMessage);
            this.partialMessageMapChanged = true;
        }

        // if message arrive out of order
        else if (currentMessage
            && incomingData.MessageMetadata.MessageCompleted === false
            && !this.hasMonotonicallyIncreasingChunkNumber(incomingData)) {
            // ignore this item and wait for the payload with MessageCompleted == true
            this.partialMessageMapChanged = false;
        }
    }

    stitchPartialMessage(messageId) {
        if (!this.partialMessageMap.has(messageId)) {
            return;
        }

        let resultMessageItem;
        let stitchedMessageContent = "";
        this.partialMessageMap.get(messageId).forEach((item) => {
            stitchedMessageContent += item.Content;
        });

        resultMessageItem = {
            ...this.partialMessageMap.get(messageId).at(-1), // use last message
            Content: stitchedMessageContent,
            AbsoluteTime: this.partialMessageMap.get(messageId)[0].AbsoluteTime, // preserve the created time
        };

        return resultMessageItem;
    }

    handleBotPartialMessage(incomingData) {
        this.updatePartialMessageMap(incomingData);

        if (this.partialMessageMapChanged) {
            this.partialMessageMapChanged = false;
            return this.stitchPartialMessage(incomingData.Id);
        }
        return null;
    }

    rehydratePartialMessageMap() {
        return response => {
            const { Transcript = [] } = response?.data || {};
            Transcript.forEach(transcriptItem => {
                if (transcriptItem && this.partialMessageMap.has(transcriptItem.Id)) {
                    this.partialMessageMap.set(transcriptItem.Id, [transcriptItem]);
                }
            });
            return response;
        };
    }
}