/**
 * End-to-end verification that a customChatClient's backend can hold both tokens. Runs the real
 * ChatController, provider and connection helpers; only the websocket and telemetry are doubled.
 */
import { ChatSessionObject } from "./chatSession";
import { GlobalConfig } from "../globalConfig";
import { ChatClient } from "../client/client";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import WebSocketManager from "../lib/amazon-connect-websocket-manager";
import { ConnectParticipantClient } from "../client/aws-sdk-connectparticipant";
import { csmService } from "../service/csmService";

jest.mock("../streamMetricUtils", () => ({
    publishError: jest.fn(),
    publishEvent: jest.fn()
}));

// Wrapped rather than stubbed so construction can be counted, which is the only way to prove no AWS fallback.
jest.mock("../client/aws-sdk-connectparticipant", () => {
    const actual = jest.requireActual("../client/aws-sdk-connectparticipant");
    return {
        ...actual,
        ConnectParticipantClient: jest.fn((...args) => new actual.ConnectParticipantClient(...args))
    };
});

describe("tokenless session (customChatClient holds both tokens)", () => {

    const WS_URL = "wss://customer-relay.example.com/socket";
    let websocketManager;

    /** Returns the minimum legal response -- a websocket and nothing else -- so ChatJS holds no token at all. */
    class TokenlessClient extends ChatClient {
        constructor() {
            super();
            this.calls = [];
        }
        createParticipantConnection(participantToken, type, acknowledgeConnection) {
            this.calls.push({ method: "createParticipantConnection", participantToken, type, acknowledgeConnection });
            return Promise.resolve({
                data: {
                    Websocket: {
                        Url: WS_URL,
                        ConnectionExpiry: new Date(Date.now() + 3600000).toISOString()
                    }
                }
            });
        }
        sendMessage(connectionToken, content, contentType) {
            this.calls.push({ method: "sendMessage", connectionToken, content, contentType });
            return Promise.resolve({ data: { Id: "id", AbsoluteTime: "t" } });
        }
        sendEvent(connectionToken, contentType, content) {
            this.calls.push({ method: "sendEvent", connectionToken, contentType, content });
            return Promise.resolve({ data: { Id: "id", AbsoluteTime: "t" } });
        }
        getTranscript(connectionToken, args) {
            this.calls.push({ method: "getTranscript", connectionToken, args });
            return Promise.resolve({ data: { InitialContactId: "cid", Transcript: [] } });
        }
        disconnectParticipant(connectionToken) {
            this.calls.push({ method: "disconnectParticipant", connectionToken });
            return Promise.resolve({ data: {} });
        }
    }

    function createWebsocketManagerDouble() {
        const refreshHandlers = [];
        const noop = () => () => {};
        return {
            subscribeTopics: jest.fn(),
            onMessage: jest.fn(noop),
            onConnectionGain: jest.fn(noop),
            onConnectionLost: jest.fn(noop),
            onInitFailure: jest.fn(noop),
            onDeepHeartbeatSuccess: jest.fn(noop),
            onDeepHeartbeatFailure: jest.fn(noop),
            onEnded: jest.fn(noop),
            onAllMessage: jest.fn(noop),
            init: jest.fn(dataProvider => { refreshHandlers.push(dataProvider); }),
            closeWebSocket: jest.fn(),
            $simulateRefresh: () => Promise.all(refreshHandlers.map(f => f()))
        };
    }

    /** No participantToken: the real one never leaves the customer's backend. */
    function createTokenlessSession(client) {
        return ChatSessionObject.create({
            chatDetails: { contactId: "cid", participantId: "pid" },
            options: { customChatClient: client },
            type: ChatSessionObject.SessionTypes.CUSTOMER,
            disableCSM: true
        });
    }

    beforeEach(() => {
        window.connect = { ...(window.connect || {}), version: "test-version" };
        jest.spyOn(csmService, "addCountMetric").mockImplementation(() => {});
        jest.spyOn(csmService, "addLatencyMetricWithStartTime").mockImplementation(() => {});
        jest.spyOn(csmService, "addCountAndErrorMetric").mockImplementation(() => {});
        jest.spyOn(csmService, "addAgentCountMetric").mockImplementation(() => {});
        LpcConnectionHelper.agentBaseInstance = null;
        LpcConnectionHelper.customerBaseInstances = {};
        jest.spyOn(WebSocketManager, "create").mockImplementation(() => {
            websocketManager = createWebsocketManagerDouble();
            return websocketManager;
        });
        ConnectParticipantClient.mockClear();
    });

    afterEach(() => {
        GlobalConfig.update({ customChatClient: null });
        jest.restoreAllMocks();
    });

    it("connects with no participantToken and no connection token anywhere", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);

        const { connectSuccess } = await session.connect();

        expect(connectSuccess).toBe(true);

        const handshake = client.calls.find(c => c.method === "createParticipantConnection");
        expect(handshake.participantToken).toBeNull();
        expect(session.getChatDetails().connectionDetails.connectionToken).toBeNull();
    });

    // reset() + tokenless together: close the socket without ending the contact, then start clean.
    it("reset() closes the socket without ending the contact, and the next connect() is tokenless again", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);
        await session.connect();
        const firstSocket = websocketManager;

        await session.reset();

        expect(client.calls.some(c => c.method === "disconnectParticipant")).toBe(false);
        expect(firstSocket.closeWebSocket).toHaveBeenCalled();
        expect(session.getChatDetails().connectionDetails).toBeNull();

        const { connectSuccess } = await session.connect();
        await session.sendMessage({ message: "after reset", contentType: "text/plain" });

        expect(connectSuccess).toBe(true);
        expect(client.calls.filter(c => c.method === "createParticipantConnection")).toHaveLength(2);
        expect(session.getChatDetails().connectionDetails.connectionToken).toBeNull();
        expect(client.calls.find(c => c.method === "sendMessage").connectionToken).toBeNull();
    });

    it("opens the websocket URL the customer's backend returned", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);

        await session.connect();
        const [transport] = await websocketManager.$simulateRefresh();

        expect(transport.webSocketTransport.url).toBe(WS_URL);
    });

    it("hands the client a null connectionToken on calls made after connecting", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);
        await session.connect();

        await session.sendMessage({ message: "hello", contentType: "text/plain" });

        const sent = client.calls.find(c => c.method === "sendMessage");
        expect(sent.connectionToken).toBeNull();
        expect(sent.content).toBe("hello");
    });

    // A fallback to the bundled client would put AWS credentials back in the browser.
    it("never constructs the AWS SDK client", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);

        await session.connect();
        await session.sendMessage({ message: "hello", contentType: "text/plain" });
        await session.getTranscript({});

        expect(ConnectParticipantClient).not.toHaveBeenCalled();
    });

    // The connection-token poll would call the customer's backend twice a day for a token that
    // does not exist, so a tokenless session must not start it.
    it("never polls the customer's backend for a connection token", async () => {
        // Installed before connect() so the poll's setTimeout, if any, lands on the fake clock.
        jest.useFakeTimers();
        try {
            const client = new TokenlessClient();
            const session = createTokenlessSession(client);
            await session.connect();
            const handshakes = () =>
                client.calls.filter(c => c.method === "createParticipantConnection").length;
            const afterConnect = handshakes();

            jest.advanceTimersByTime(24 * 60 * 60 * 1000);
            await Promise.resolve();

            expect(handshakes()).toBe(afterConnect);
        } finally {
            jest.useRealTimers();
        }
    });

    // Reusing held details is what stops a redundant createParticipantConnection per connect.
    it("does not re-handshake to refresh the websocket", async () => {
        const client = new TokenlessClient();
        const session = createTokenlessSession(client);
        await session.connect();

        await websocketManager.$simulateRefresh();

        const handshakes = client.calls.filter(c => c.method === "createParticipantConnection");
        expect(handshakes).toHaveLength(1);
    });

    // The bundled client must keep treating a missing credentials block as malformed.
    it("still fails when the bundled AWS client gets no ConnectionCredentials", async () => {
        const session = ChatSessionObject.create({
            chatDetails: { contactId: "cid", participantId: "pid", participantToken: "ptoken" },
            options: {},
            type: ChatSessionObject.SessionTypes.CUSTOMER,
            disableCSM: true
        });
        jest.spyOn(session.controller.chatClient, "createParticipantConnection")
            .mockResolvedValue({ data: { Websocket: { Url: WS_URL, ConnectionExpiry: "later" } } });

        // connect() rejects on failure, with the same schema as a success. The failure is the
        // same TypeError as before this feature: the tokenless branch is not entered.
        await expect(session.connect()).rejects.toEqual(expect.objectContaining({
            connectSuccess: false,
            _debug: expect.objectContaining({
                _debug: expect.any(TypeError)
            })
        }));
    });
});
