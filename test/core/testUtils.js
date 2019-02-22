import {
  ConnectionHelper,
  ConnectionHelperStatus
} from "../../src/core/connectionHelper";
import { MQTTClient } from "../../src/core/connectionManager";
import { MqttConnectionStatus } from "../../src/core/connectionManager";

const TextMessage = {
  ContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  Data: {
    Content: "Initiate Chat Test Message",
    ContentType: "text/plain",
    CreatedTimestamp: "2019-02-21T07:14:37.557Z",
    ItemId: "519b8a68-0cbd-4138-86e0-df954f4b4554",
    Type: "MESSAGE"
  },
  InitialContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  SenderDetails: {
    DisplayName: "DisplayName",
    ParticipantId: "5c2c827f-18ca-4b8a-869e-acefe4a74dc4"
  }
};

const ParticipantJoinedEvent = {
  ContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  Data: {
    Content: null,
    ContentType: null,
    CreatedTimestamp: "2019-02-21T07:15:53.333Z",
    ItemId: "f028e430-c910-47c7-82f9-f6919532964c",
    Type: "PARTICIPANT_JOINED"
  },
  InitialContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  SenderDetails: {
    DisplayName: "DisplayName",
    ParticipantId: "5c2c827f-18ca-4b8a-869e-acefe4a74dc4"
  }
};

const TypingEvent = {
  InitialContactId: "testInitialContactId",
  SenderDetails: {
    ParticipantId: "thisParticipantId",
    DisplayName: "thisName"
  },
  Data: {
    CreatedTimestamp: "2019-02-21T07:16:04.389Z",
    Type: "TYPING",
    ItemId: "2d9fb1f0-d7c2-478d-a1ec-ec6cda62e7bd"
  }
};

const SendMessageResponse = {
  MessageId: "b1cac905-f95d-401c-a1e6-97f933976767"
};

const SendEventResponse = { EventId: "2d9fb1f0-d7c2-478d-a1ec-ec6cda62e7bd" };

const GetTranscriptResponse = {
  Items: [TextMessage, TypingEvent],
  NextToken: ""
};

const CreateConnectionDetailsResponse = {
  ConnectionId: "e2dc6984-d8df-437a-a523-63b55ec6bb81",
  ParticipantCredentials: {
    ConnectionAuthenticationToken: "AQIDAH=",
    Expiry: null
  },
  PreSignedConnectionUrl:
    "wss://a2sg9pz864ik5-ats.iot.us-west-2.amazonaws.com/mqtt"
};

const DisconnectChatResponse = {};

const MockChatClient = {
  sendMessage: (connectionToken, message, type) => {
    return Promise.resolve({ data: SendMessageResponse });
  },
  getTranscript: (connectionToken, args) => {
    return Promise.resolve({ data: GetTranscriptResponse });
  },
  sendEvent: (
    connectionToken,
    eventType,
    messageIds,
    visibility,
    persistence
  ) => {
    return Promise.resolve({ data: SendEventResponse });
  },
  disconnectChat: connectionToken => {
    return Promise.resolve({ data: DisconnectChatResponse });
  },
  createConnectionDetails: participantToken => {
    return Promise.resolve({ data: CreateConnectionDetailsResponse });
  }
};

class MockConnectionHelper extends ConnectionHelper {
  constructor(callback) {
    super();
    this.status = ConnectionHelperStatus.NeverStarted;
    this.callback = callback;
  }

  scheduleEvent(eventType, eventData, timeInMillis = 0) {
    setTimeout(() => {
      this.callback(eventType, eventData);
    }, timeInMillis);
  }

  start() {
    this.status = ConnectionHelperStatus.Starting;
    return Promise.resolve().then(() => {
      this.status = ConnectionHelperStatus.Connected;
      return;
    });
  }

  end() {
    this.status = ConnectionHelperStatus.Ended;
  }
  getStatus() {
    return this.status;
  }
}

class MockMqttConnection extends MQTTClient {
  constructor(callback) {
    super(callback);
    this.callback = callback;
    this.status = MqttConnectionStatus.NeverConnected;
  }

  getStatus() {
    return this.status;
  }

  scheduleEvent(eventType, eventData, timeInMillis = 0) {
    setTimeout(() => {
      this.callback(eventType, eventData);
    }, timeInMillis);
  }

  connect() {
    this.status = MqttConnectionStatus.Connecting;
    return Promise.resolve().then(() => {
      this.status = MqttConnectionStatus.Connected;
    });
  }

  disconnect() {
    this.status = MqttConnectionStatus.Disconnected;
    return;
  }

  subscribe() {
    return Promise.resolve();
  }

  unsubscribe() {
    return new Promise(function(resolve, reject) {
      resolve();
    });
  }
}

export {
  MockConnectionHelper,
  MockChatClient,
  SendMessageResponse,
  SendEventResponse,
  GetTranscriptResponse,
  CreateConnectionDetailsResponse,
  DisconnectChatResponse,
  TextMessage,
  TypingEvent,
  MockMqttConnection
};
