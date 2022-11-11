import { CHAT_EVENTS, DEFAULT_THROTTLE_TIME } from '../constants';
import { LogManager } from '../log';

export default class MessageReceiptsUtil {
  constructor(logMetaData) {
    this.logger = LogManager.getLogger({ prefix: 'ChatJS-MessageReceiptUtil', logMetaData });
    this.timeout = null;
    this.timeoutId = null;
    this.readSet = new Set();
    this.deliveredSet = new Set();
    this.readPromiseMap = new Map();
    this.deliveredPromiseMap = new Map();
    this.lastReadArgs = null;
    this.throttleInitialEventsToPrioritizeRead = null;
    this.throttleSendEventApiCall = null;
  }

  /**
   * check if message is of type read or delivered event
   *
   * @param {string} eventType either INCOMING_READ_RECEIPT or INCOMING_DELIVERED_RECEIPT.
   * @param {Object} incomingData object contains messageDetails
   * @return {boolean} returns true if read or delivered event else false
  */
  isMessageReceipt(eventType, incomingData) {
    return [CHAT_EVENTS.INCOMING_READ_RECEIPT, CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT]
      .indexOf(eventType) !== -1 || incomingData.Type === CHAT_EVENTS.MESSAGE_METADATA;
  }

  /** 
   * check if message is for currentParticipantId 
   * 
   * @param {string} currentParticipantId of the contact
   * @param {Object} incomingData object contains messageDetails
   * @return {boolean} returns true if we need to display messageReceipt for the currentParticipantId
   * 
  */
  getEventTypeFromMessageMetaData(messageMetadata) {
    return Array.isArray(messageMetadata.Receipts) &&
      messageMetadata.Receipts[0] &&
      messageMetadata.Receipts[0].ReadTimestamp ? CHAT_EVENTS.INCOMING_READ_RECEIPT :
      messageMetadata.Receipts[0].DeliverTimestamp ? CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT : null;
  }

  /** 
   * check if message is for currentParticipantId 
   * 
   * @param {string} currentParticipantId of the contact
   * @param {Object} incomingData object contains messageDetails
   * @return {boolean} returns true if we need to display messageReceipt for the currentParticipantId
   * 
  */
  shouldShowMessageReceiptForCurrentParticipantId(currentParticipantId, incomingData) {
    const recipientParticipantId = incomingData.MessageMetadata &&
      Array.isArray(incomingData.MessageMetadata.Receipts) &&
      incomingData.MessageMetadata.Receipts[0] &&
      incomingData.MessageMetadata.Receipts[0].RecipientParticipantId;
    return currentParticipantId !== recipientParticipantId;
  }

  /**
   * Assumption: sendMessageReceipts are called in correct order of time the messages are Delivered or Read
   * Prioritize Read Event by Throttling Delivered events for 300ms but firing Read events immediately!
   *
   * @param {function} callback The callback fn to throttle and invoke.
   * @param {Array} args array of params [connectionToken, contentType, content, eventType, throttleTime]
   * @return {promise} returnPromise for Read and Delivered events
  */
  prioritizeAndSendMessageReceipt(callback, ...args) {
    var self = this;
    var deliverEventThrottleTime = 300;
    var size = args.length;
    var eventType = args[size - 2];
    var content = JSON.parse(args[size - 3]);
    var messageId = content.MessageId;

    //ignore repeat events - do not make sendEvent API call.
    if (self.readPromiseMap.has(messageId) || self.deliveredPromiseMap.has(messageId)) {
      return Promise.resolve({
        message: 'Event already fired'
      });
    }

    var resolve, reject;
    var returnPromise = new Promise(function (res, rej) {
      resolve = res;
      reject = rej;
    });

    if (eventType === CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT) {
      self.deliveredPromiseMap.set(messageId, [resolve, reject]);
    } else {
      self.readPromiseMap.set(messageId, [resolve, reject]);
    }

    self.throttleInitialEventsToPrioritizeRead = function () {
      // ignore Delivered event if Read event has been triggered for the current messageId
      if (eventType === CHAT_EVENTS.INCOMING_DELIVERED_RECEIPT &&
        self.readSet.has(messageId)) {
        self.deliveredSet.add(messageId);
        self.resolveDeliveredPromises(messageId, 'Event already fired');
        return resolve({
          message: 'Event already fired'
        });
      }
      self.logger.debug('call next throttleFn sendMessageReceipts', args);
      self.sendMessageReceipts.call(self, callback, ...args);
    };

    if (!self.timeout) {
      self.timeout = setTimeout(function () {
        self.timeout = null;
        self.throttleInitialEventsToPrioritizeRead();
      }, deliverEventThrottleTime)
    }

    //prevent multiple Read events for same messageId
    if (eventType === CHAT_EVENTS.INCOMING_READ_RECEIPT && !self.readSet.has(messageId)) {
      self.readSet.add(messageId);
      clearTimeout(self.timeout);
      self.timeout = null;
      self.throttleInitialEventsToPrioritizeRead();
    }

    return returnPromise;
  }

  /**
   * Throttle for ${DEFAULT_THROTTLE_TIME} and then fire Read and Delivered events
   *
   * @param {function} callback The callback fn to throttle and invoke.
   * @param {Array} args array of params [connectionToken, contentType, content, eventType, throttleTime]
  */
  sendMessageReceipts(callback, ...args) {
    var self = this;
    var size = args.length;
    var throttleTime = args[size - 1] || DEFAULT_THROTTLE_TIME;
    var eventType = args[size - 2];
    var content = JSON.parse(args[size - 3]);
    var messageId = content.MessageId;
    this.lastReadArgs = eventType === CHAT_EVENTS.INCOMING_READ_RECEIPT ? args : this.lastReadArgs;

    self.throttleSendEventApiCall = function () {
      try {
        if (eventType === CHAT_EVENTS.INCOMING_READ_RECEIPT) {
          var sendEventPromise = callback.apply(self, args);
          self.resolveReadPromises(messageId, sendEventPromise);
          self.logger.debug('send Read event:', callback, args);
        } else {
          //delivered event is the last event fired
          //fire delivered for latest messageId
          //fire read for latest messageId
          var PromiseArr = [callback.apply(self, args)];
          if (this.lastReadArgs) {
            var contentVal = JSON.parse(this.lastReadArgs[size - 3]);
            var readEventMessageId = contentVal.MessageId;
            // if readPromise has been resolved for readEventMessageId; readPromiseMap should not contain readEventMessageId
            // if readPromiseMap contains readEventMessageId; read event has not been called!
            if (self.readPromiseMap.has(readEventMessageId)) {
              PromiseArr.push(callback.apply(self, this.lastReadArgs));
            }
          }
          self.logger.debug('send Delivered event:', args, 'read event:', this.lastReadArgs);
          Promise.all(PromiseArr).then(res => {
            self.resolveReadPromises(contentVal.MessageId, res[0]);
            self.resolveDeliveredPromises(messageId, res[0]);
          })
        }
      } catch (err) {
        self.logger.error('send message receipt failed', err);
        self.resolveReadPromises(messageId, err, true);
        self.resolveDeliveredPromises(messageId, err, true);
      }
    }

    if (!self.timeoutId) {
      self.timeoutId = setTimeout(function () {
        self.timeoutId = null;
        self.throttleSendEventApiCall();
      }, throttleTime);
    }
  }

  /**
   * resolve All Delivered promises till messageId
   *
   * @param {string} messageId of the latest message receipt event
   * @param {Object} result of the latest message receipt event
  */
  resolveDeliveredPromises(messageId, result, isError) {
    return this.resolvePromises(this.deliveredPromiseMap, messageId, result, isError);
  }

  /**
   * resolve All Read promises till messageId
   *
   * @param {string} messageId of the latest message receipt event
   * @param {Object} result of the latest message receipt event
  */
  resolveReadPromises(messageId, result, isError) {
    return this.resolvePromises(this.readPromiseMap, messageId, result, isError);
  }

  /**
   * resolve All promises till messageId
   *
   * @param {Map} promiseMap of either send or delivered promises
   * @param {string} messageId of the latest message receipt event
   * @param {Object} result of the latest message receipt event
  */
  resolvePromises(promiseMap, messageId, result, isError) {
    var arr = Array.from(promiseMap.keys());
    var indexToResolve = arr.indexOf(messageId);

    if (indexToResolve !== -1) {
      for (let i = 0; i <= indexToResolve; i++) {
        var callbackFn = promiseMap.get(arr[i])?.[isError ? 1 : 0];
        if (typeof callbackFn === 'function') {
          promiseMap.delete(arr[i]);
          callbackFn(result);
        }
      }
    } else {
      this.logger.debug(`Promise for messageId: ${messageId} already resolved`);
    }
  }

  /**
   * getTranscript API call should hydrate readSet and deliveredSet
   *
   * @param {function} callback to call with getTranscript response object.
   * @param {boolean} shouldSendMessageReceipts decides whether to hydrate mappers or not
   * @return {function} function which takes in input response from API call and calls callback with response.
  */
  rehydrateReceiptMappers(callback, shouldSendMessageReceipts) {
    var self = this;
    return response => {
      self.logger.debug('rehydrate chat', response?.data);
      if (shouldSendMessageReceipts) {
        const { Transcript = [] } = response?.data || {};
        Transcript.forEach(transcript => {
          if (transcript?.Type === CHAT_EVENTS.MESSAGE_METADATA) {
            const Receipt = transcript?.MessageMetadata?.Receipts?.[0];
            const MessageId = transcript?.MessageMetadata?.MessageId;
            if (Receipt?.ReadTimestamp) {
              this.readSet.add(MessageId);
            }
            if (Receipt?.DeliverTimestamp) {
              this.deliveredSet.add(MessageId);
            }
          }
        });
      }
      // send MessageReceipt for latest message is done by ChatInterface
      // UI will send Read receipt for the latest message displayed in the UI.
      return callback(response);
    }
  }

}