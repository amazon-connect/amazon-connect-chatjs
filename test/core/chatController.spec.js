import { PersistentConnectionAndChatServiceController } from "../../src/core/chatController";
import { ChatServiceArgsValidator } from "../../src/core/chatArgsValidator";
import { EventConstructor } from "../../src/core/eventConstructor";
import { EventBus } from "../../src/core/eventbus";
import {
  MockChatClient,
  MockConnectionHelper,
  SendMessageResponse,
  SendEventResponse,
  GetTranscriptResponse,
  DisconnectChatResponse,
  TextMessage,
  TypingEvent
} from "./testUtils";
import {
  ConnectionHelperStatus,
  ConnectionHelperEvents
} from "../../src/core/connectionHelper";
import { CHAT_EVENTS } from "../../src/constants";
import { ChatSessionObject } from "../../src/core/chatSession";

var CHAT_DETAILS = {
  connectionDetails: {
    ConnectionId: "021bb2f0-657d-4d08-a9a5-4caa543a966d",
    connectionToken: "AQIDAHX",
    PreSignedConnectionUrl:
      "wss://a2sg9pz864ik5-ats.iot.us-west-2.amazonaws.com/mqtt"
  },
  initialContactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  contactId: "8e4a71b4-60b2-49cf-8566-8f984aa8add4",
  participantId: "5c2c827f-18ca-4b8a-869e-acefe4a74dc4"
};

const _createController = createConnectionHelperProvider => {
  var args = {};
  args.argsValidator = new ChatServiceArgsValidator();
  args.chatEventConstructor = new EventConstructor();
  args.chatDetails = CHAT_DETAILS;
  args.chatClient = MockChatClient;
  args.hasConnectionDetails = true;
  var MockChatControllerFactory = {
    createConnectionHelperProvider: createConnectionHelperProvider
  };
  args.chatControllerFactory = MockChatControllerFactory;
  args.pubsub = new EventBus();
  args.argsValidator = new ChatServiceArgsValidator();
  args.argsValidator = new ChatServiceArgsValidator();
  return new PersistentConnectionAndChatServiceController(args);
};

var setup = {};

beforeEach(() => {
  ChatSessionObject.setGlobalConfig({
    loggerConfig: {
      debug: true,
      level: 1
    },
    region: "us-east-1"
  });
  var connectionHelper = new MockConnectionHelper();
  var createConnectionHelperProvider = jest.fn(
    (connectionDetails, contactId) => {
      return callback => {
        connectionHelper.callback = callback;
        return connectionHelper;
      };
    }
  );
  setup.connectionHelper = connectionHelper;
  setup.controller = _createController(createConnectionHelperProvider);
});

test("sendMessage works as expected", () => {
  var metadata = "metadata";
  var expectedResponse = {};
  expectedResponse.data = SendMessageResponse;
  expectedResponse.metadata = metadata;
  var args = {
    metadata: metadata,
    message: "testMessage"
  };
  return setup.controller.sendMessage(args).then(response => {
    expect(response).toEqual(expectedResponse);
  });
});

test("sendEvent works as expected", () => {
  var metadata = "metadata";
  var expectedResponse = {};
  expectedResponse.data = SendEventResponse;
  expectedResponse.metadata = metadata;
  var args = {
    metadata: metadata,
    eventType: "testEvent"
  };
  return setup.controller.sendEvent(args).then(response => {
    expect(response).toEqual(expectedResponse);
  });
});

test("getTranscript works as expected", () => {
  var metadata = "metadata";
  var expectedResponse = {};
  expectedResponse.data = GetTranscriptResponse;
  expectedResponse.metadata = metadata;
  var args = {
    metadata: metadata
  };
  return setup.controller.getTranscript(args).then(response => {
    expect(response).toEqual(expectedResponse);
  });
});

test("disconnect works as expected", () => {
  var expectedResponse = {};
  expectedResponse.data = DisconnectChatResponse;
  return setup.controller.disconnectParticipant().then(response => {
    expect(response).toEqual(expectedResponse);
  });
});

test("incoming message receive works as expected", done => {
  const onMessage = eventData => {
    expect(eventData.data).toEqual(TextMessage);
    expect(eventData.chatDetails.contactId).toEqual(CHAT_DETAILS.contactId);
    done();
  };
  var incomingMessage = {
    payloadString: JSON.stringify(TextMessage)
  };
  setup.controller.subscribe(CHAT_EVENTS.INCOMING_MESSAGE, onMessage);
  setup.connectionHelper.scheduleEvent(
    ConnectionHelperEvents.IncomingMessage,
    incomingMessage
  );
});

test("incoming typing receive works as expected", done => {
  const onTyping = eventData => {
    expect(eventData.data).toEqual(TypingEvent);
    expect(eventData.chatDetails.contactId).toEqual(CHAT_DETAILS.contactId);
    done();
  };
  var incomingMessage = {
    payloadString: JSON.stringify(TypingEvent)
  };
  setup.controller.subscribe(CHAT_EVENTS.INCOMING_TYPING, onTyping);
  setup.connectionHelper.scheduleEvent(
    ConnectionHelperEvents.IncomingMessage,
    incomingMessage
  );
});
