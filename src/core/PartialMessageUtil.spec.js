import PartialMessageUtil from './PartialMessageUtil.js';

describe('PartialMessageUtil', () => {
    let util;

    beforeEach(() => {
        util = new PartialMessageUtil();
    });

    describe('constructor', () => {
        it('should initialize with empty Map and false flag', () => {
            expect(util.partialMessageMap).toBeInstanceOf(Map);
            expect(util.partialMessageMap.size).toBe(0);
            expect(util.partialMessageMapChanged).toBe(false);
        });
    });

    describe('isPartialMessage', () => {
        it('should return true for valid partial message', () => {
            const data = {
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: false }
            };
            expect(util.isPartialMessage(data)).toBe(true);
        });

        it('should return false for non-SYSTEM participant', () => {
            const data = {
                ParticipantRole: "AGENT",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: false }
            };
            expect(util.isPartialMessage(data)).toBe(false);
        });

        it('should return false for non-MESSAGE type', () => {
            const data = {
                ParticipantRole: "SYSTEM",
                Type: "EVENT",
                MessageMetadata: { MessageCompleted: false }
            };
            expect(util.isPartialMessage(data)).toBe(false);
        });

        it('should return false when MessageCompleted is null', () => {
            const data = {
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: null }
            };
            expect(util.isPartialMessage(data)).toBe(false);
        });

        it('should return false when MessageCompleted is undefined', () => {
            const data = {
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: undefined }
            };
            expect(util.isPartialMessage(data)).toBe(false);
        });

        it('should return false for null input', () => {
            expect(util.isPartialMessage(null)).toBe(false);
        });

        it('should return false for undefined input', () => {
            expect(util.isPartialMessage(undefined)).toBe(false);
        });
    });

    describe('hasMonotonicallyIncreasingChunkNumber', () => {
        beforeEach(() => {
            util.partialMessageMap.set('msg1', [{
                MessageMetadata: { ChunkNumber: 1 }
            }]);
        });

        it('should return true for next chunk number', () => {
            const data = {
                Id: 'msg1',
                MessageMetadata: { ChunkNumber: 2 }
            };
            expect(util.hasMonotonicallyIncreasingChunkNumber(data)).toBe(true);
        });

        it('should return false for non-sequential chunk number', () => {
            const data = {
                Id: 'msg1',
                MessageMetadata: { ChunkNumber: 3 }
            };
            expect(util.hasMonotonicallyIncreasingChunkNumber(data)).toBe(false);
        });

        it('should return false when no existing message', () => {
            const data = {
                Id: 'msg2',
                MessageMetadata: { ChunkNumber: 1 }
            };
            expect(util.hasMonotonicallyIncreasingChunkNumber(data)).toBeFalsy();
        });

        it('should return false when ChunkNumber is missing', () => {
            const data = {
                Id: 'msg1',
                MessageMetadata: {}
            };
            expect(util.hasMonotonicallyIncreasingChunkNumber(data)).toBeFalsy();
        });
    });

    describe('updatePartialMessageMap', () => {
        it('should set flag to false for non-partial message', () => {
            const data = { ParticipantRole: "AGENT" };
            util.updatePartialMessageMap(data);
            expect(util.partialMessageMapChanged).toBe(false);
        });

        it('should create new entry for first partial message', () => {
            const data = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 1 }
            };
            util.updatePartialMessageMap(data);
            expect(util.partialMessageMap.has('msg1')).toBe(true);
            expect(util.partialMessageMap.get('msg1')).toEqual([data]);
            expect(util.partialMessageMapChanged).toBe(true);
        });

        it('should replace with completed message', () => {
            const partial = {
                Id: 'msg1',
                MessageMetadata: { MessageCompleted: false }
            };
            util.partialMessageMap.set('msg1', [partial]);

            const completed = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: true }
            };
            util.updatePartialMessageMap(completed);
            expect(util.partialMessageMap.get('msg1')).toEqual([completed]);
            expect(util.partialMessageMapChanged).toBe(true);
        });

        it('should replace with completed message even if there has been no previous partial message', () => {
            const completed = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: true }
            };
            util.updatePartialMessageMap(completed);
            expect(util.partialMessageMap.get('msg1')).toEqual([completed]);
            expect(util.partialMessageMapChanged).toBe(true);
        });

        it('should not set flag when completed message replaces already completed', () => {
            const completed = {
                Id: 'msg1',
                MessageMetadata: { MessageCompleted: true }
            };
            util.partialMessageMap.set('msg1', [completed]);

            const newCompleted = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: true }
            };
            util.updatePartialMessageMap(newCompleted);
            expect(util.partialMessageMapChanged).toBe(false);
        });

        it('should append sequential partial message', () => {
            const first = {
                Id: 'msg1',
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 1 }
            };
            util.partialMessageMap.set('msg1', [first]);

            const second = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 2 }
            };
            util.updatePartialMessageMap(second);
            expect(util.partialMessageMap.get('msg1')).toEqual([first, second]);
            expect(util.partialMessageMapChanged).toBe(true);
        });

        it('should ignore out-of-order partial message', () => {
            const first = {
                Id: 'msg1',
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 1 }
            };
            util.partialMessageMap.set('msg1', [first]);

            const outOfOrder = {
                Id: 'msg1',
                ParticipantRole: "SYSTEM",
                Type: "MESSAGE",
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 3 }
            };
            util.updatePartialMessageMap(outOfOrder);
            expect(util.partialMessageMap.get('msg1')).toEqual([first]);
            expect(util.partialMessageMapChanged).toBe(false);
        });
    });

    describe('stitchPartialMessage', () => {
        it('should return undefined for non-existent message', () => {
            expect(util.stitchPartialMessage('nonexistent')).toBeUndefined();
        });

        it('should stitch single partial message', () => {
            const message = {
                Id: 'msg1',
                Content: 'Hello',
                AbsoluteTime: '2023-01-01T00:00:00Z',
                MessageMetadata: { ChunkNumber: 1 }
            };
            util.partialMessageMap.set('msg1', [message]);

            const result = util.stitchPartialMessage('msg1');
            expect(result.Content).toBe('Hello');
            expect(result.AbsoluteTime).toBe('2023-01-01T00:00:00Z');
        });

        it('should stitch multiple partial messages', () => {
            const messages = [
                {
                    Id: 'msg1',
                    Content: 'Hello ',
                    AbsoluteTime: '2023-01-01T00:00:00Z',
                    MessageMetadata: { ChunkNumber: 1 }
                },
                {
                    Id: 'msg1',
                    Content: 'World',
                    AbsoluteTime: '2023-01-01T00:00:01Z',
                    MessageMetadata: { ChunkNumber: 2 }
                }
            ];
            util.partialMessageMap.set('msg1', messages);

            const result = util.stitchPartialMessage('msg1');
            expect(result.Content).toBe('Hello World');
            expect(result.AbsoluteTime).toBe('2023-01-01T00:00:00Z');
            expect(result.MessageMetadata.ChunkNumber).toBe(2);
        });

        it('should preserve properties from last message', () => {
            const messages = [
                {
                    Id: 'msg1',
                    Content: 'Hello ',
                    AbsoluteTime: '2023-01-01T00:00:00Z',
                    MessageMetadata: { ChunkNumber: 1, MessageCompleted: false }
                },
                {
                    Id: 'msg1',
                    Content: 'World',
                    AbsoluteTime: '2023-01-01T00:00:01Z',
                    MessageMetadata: { ChunkNumber: 2, MessageCompleted: true }
                }
            ];
            util.partialMessageMap.set('msg1', messages);

            const result = util.stitchPartialMessage('msg1');
            expect(result.MessageMetadata.MessageCompleted).toBe(true);
            expect(result.AbsoluteTime).toBe('2023-01-01T00:00:00Z');
        });
    });

    describe('rehydratePartialMessageMap', () => {
        it('should return function that processes response', () => {
            const rehydrateFunc = util.rehydratePartialMessageMap();
            expect(typeof rehydrateFunc).toBe('function');
        });

        it('should update existing partial messages from transcript', () => {
            util.partialMessageMap.set('msg1', [{ Id: 'msg1', Content: 'partial' }]);
            
            const response = {
                data: {
                    Transcript: [
                        { Id: 'msg1', Content: 'complete message' },
                        { Id: 'msg2', Content: 'other message' }
                    ]
                }
            };

            const rehydrateFunc = util.rehydratePartialMessageMap();
            const result = rehydrateFunc(response);

            expect(util.partialMessageMap.get('msg1')).toEqual([{ Id: 'msg1', Content: 'complete message' }]);
            expect(result).toBe(response);
        });

        it('should handle empty transcript', () => {
            const response = { data: { Transcript: [] } };
            const rehydrateFunc = util.rehydratePartialMessageMap();
            const result = rehydrateFunc(response);
            expect(result).toBe(response);
        });

        it('should handle missing data', () => {
            const response = {};
            const rehydrateFunc = util.rehydratePartialMessageMap();
            const result = rehydrateFunc(response);
            expect(result).toBe(response);
        });

        it('should ignore transcript items not in partial map', () => {
            const response = {
                data: {
                    Transcript: [{ Id: 'msg1', Content: 'message' }]
                }
            };

            const rehydrateFunc = util.rehydratePartialMessageMap();
            rehydrateFunc(response);

            expect(util.partialMessageMap.has('msg1')).toBe(false);
        });

        it('should handle null transcript items', () => {
            util.partialMessageMap.set('msg1', [{ Id: 'msg1', Content: 'partial' }]);
            
            const response = {
                data: {
                    Transcript: [null, { Id: 'msg1', Content: 'complete' }]
                }
            };

            const rehydrateFunc = util.rehydratePartialMessageMap();
            const result = rehydrateFunc(response);

            expect(util.partialMessageMap.get('msg1')).toEqual([{ Id: 'msg1', Content: 'complete' }]);
            expect(result).toBe(response);
        });
    });

    describe('handleBotPartialMessage', () => {
        test('should return stitched message when map changes', () => {
            const incomingData = {
                Id: 'msg1',
                Content: 'Hello',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                MessageMetadata: {
                    MessageCompleted: false,
                    ChunkNumber: 1
                }
            };

            const result = util.handleBotPartialMessage(incomingData);

            expect(result).toEqual({
                ...incomingData,
                Content: 'Hello'
            });
            expect(util.partialMessageMapChanged).toBe(false);
        });

        test('should return null when map does not change', () => {
            const incomingData = {
                Id: 'msg1',
                Content: 'Hello',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                MessageMetadata: {
                    MessageCompleted: false,
                    ChunkNumber: 3
                }
            };

            const result = util.handleBotPartialMessage(incomingData);

            expect(result).toBeNull();
            expect(util.partialMessageMapChanged).toBe(false);
        });

        test('should handle sequential partial messages', () => {
            const firstChunk = {
                Id: 'msg1',
                Content: 'Hello ',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                AbsoluteTime: '2023-01-01T00:00:00Z',
                MessageMetadata: {
                    MessageCompleted: false,
                    ChunkNumber: 1
                }
            };

            const secondChunk = {
                Id: 'msg1',
                Content: 'World',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                AbsoluteTime: '2023-01-01T00:00:01Z',
                MessageMetadata: {
                    MessageCompleted: false,
                    ChunkNumber: 2
                }
            };

            const firstResult = util.handleBotPartialMessage(firstChunk);
            const secondResult = util.handleBotPartialMessage(secondChunk);

            expect(firstResult.Content).toBe('Hello ');
            expect(secondResult.Content).toBe('Hello World');
            expect(secondResult.AbsoluteTime).toBe('2023-01-01T00:00:00Z');
        });

        test('should handle completed message', () => {
            util.partialMessageMap.set('msg1', [{
                Id: 'msg1',
                Content: 'Partial',
                MessageMetadata: { MessageCompleted: false, ChunkNumber: 1 }
            }]);

            const completedMessage = {
                Id: 'msg1',
                Content: 'Complete message',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                MessageMetadata: {
                    MessageCompleted: true
                }
            };

            const result = util.handleBotPartialMessage(completedMessage);

            expect(result.Content).toBe('Complete message');
            expect(result.MessageMetadata.MessageCompleted).toBe(true);
        });

        test('should reset partialMessageMapChanged flag after returning stitched message', () => {
            const incomingData = {
                Id: 'msg1',
                Content: 'Test',
                ParticipantRole: 'SYSTEM',
                Type: 'MESSAGE',
                MessageMetadata: {
                    MessageCompleted: false,
                    ChunkNumber: 1
                }
            };

            util.handleBotPartialMessage(incomingData);

            expect(util.partialMessageMapChanged).toBe(false);
        });
    });
});