/** Acceptance tests for suspend/resume and reset(), using the real controller with only the websocket and telemetry doubled. */
import { ChatSessionObject } from "./chatSession";
import { GlobalConfig } from "../globalConfig";
import { ChatClient } from "../client/client";
import LpcConnectionHelper from "./connectionHelpers/LpcConnectionHelper";
import WebSocketManager from "../lib/amazon-connect-websocket-manager";
import { csmService } from "../service/csmService";

jest.mock("../streamMetricUtils", () => ({
    publishError: jest.fn(),
    publishEvent: jest.fn()
}));

const WS_URL = "wss://customer-relay.example.com/socket";
const NO_CONNECTION = /No active connection/;

/** A customChatClient. Tokenless by default; pass { expiresInMs } to return stand-in credentials. */
class TestClient extends ChatClient {
    constructor({ expiresInMs } = {}) {
        super();
        this.calls = [];
        this.expiresInMs = expiresInMs;
        this.deferNextHandshake = false;
        this.releaseHandshake = null;
        this.failNextHandshake = false;
        this.deferNextTranscript = false;
        this.releaseTranscript = null;
    }
    createParticipantConnection() {
        this.calls.push({ method: "createParticipantConnection" });
        const data = { Websocket: { Url: WS_URL, ConnectionExpiry: new Date(Date.now() + 3600000).toISOString() } };
        if (this.expiresInMs) {
            data.ConnectionCredentials = {
                ConnectionToken: "stand-in",
                Expiry: new Date(Date.now() + this.expiresInMs).toISOString()
            };
        }
        if (this.failNextHandshake) {
            const error = this.failNextHandshake === true ? new Error("handshake failed") : this.failNextHandshake;
            this.failNextHandshake = false;
            return Promise.reject(error);
        }
        if (this.deferNextHandshake) {
            this.deferNextHandshake = false;
            return new Promise(resolve => { this.releaseHandshake = () => resolve({ data }); });
        }
        return Promise.resolve({ data });
    }
    sendMessage(connectionToken, content) {
        this.calls.push({ method: "sendMessage", connectionToken, content });
        return Promise.resolve({ data: { Id: `m-${this.calls.length}`, AbsoluteTime: "t" } });
    }
    sendEvent() { return Promise.resolve({ data: { Id: "e", AbsoluteTime: "t" } }); }
    getTranscript() {
        this.calls.push({ method: "getTranscript" });
        if (this.deferNextTranscript) {
            this.deferNextTranscript = false;
            return new Promise(resolve => { this.releaseTranscript = () => resolve({ data: { InitialContactId: "cid", Transcript: [] } }); });
        }
        return Promise.resolve({ data: { InitialContactId: "cid", Transcript: [
            { Id: "t1", Type: "MESSAGE", ContentType: "text/plain", Content: "earlier", AbsoluteTime: "2026-01-01T00:00:00.000Z" }
        ] } });
    }
    disconnectParticipant(connectionToken) {
        this.calls.push({ method: "disconnectParticipant", connectionToken });
        return Promise.resolve({ data: {} });
    }
    count(method) { return this.calls.filter(c => c.method === method).length; }
}

describe("customer session lifecycle: suspend / resume / reset", () => {
    let sockets;
    const latestSocket = () => sockets[sockets.length - 1];

    function createSocketDouble() {
        const handlers = { message: [] };
        const noop = () => () => {};
        return {
            subscribeTopics: jest.fn(),
            onMessage: jest.fn((topic, handler) => { handlers.message.push(handler); return () => {}; }),
            onConnectionGain: jest.fn(noop),
            onConnectionLost: jest.fn(noop),
            onInitFailure: jest.fn(noop),
            onDeepHeartbeatSuccess: jest.fn(noop),
            onDeepHeartbeatFailure: jest.fn(noop),
            onEnded: jest.fn(noop),
            onAllMessage: jest.fn(noop),
            init: jest.fn(),
            closeWebSocket: jest.fn(),
            $deliver: (item) => handlers.message.forEach(h => h({ content: JSON.stringify(item) }))
        };
    }

    function createSession(client, contactId = "cid") {
        return ChatSessionObject.create({
            chatDetails: { contactId, participantId: `p-${contactId}` },
            options: client ? { customChatClient: client } : {},
            type: ChatSessionObject.SessionTypes.CUSTOMER,
            disableCSM: true
        });
    }

    const agentMessage = (contactId, content) =>
        ({ Id: `in-${content}`, Type: "MESSAGE", ContentType: "text/plain", ContactId: contactId, InitialContactId: contactId, ParticipantRole: "AGENT", Content: content });

    beforeEach(() => {
        window.connect = { ...(window.connect || {}), version: "test-version" };
        jest.spyOn(csmService, "addCountMetric").mockImplementation(() => {});
        jest.spyOn(csmService, "addLatencyMetricWithStartTime").mockImplementation(() => {});
        jest.spyOn(csmService, "addCountAndErrorMetric").mockImplementation(() => {});
        jest.spyOn(csmService, "addAgentCountMetric").mockImplementation(() => {});
        LpcConnectionHelper.agentBaseInstance = null;
        LpcConnectionHelper.customerBaseInstances = {};
        sockets = [];
        jest.spyOn(WebSocketManager, "create").mockImplementation(() => {
            const socket = createSocketDouble();
            sockets.push(socket);
            return socket;
        });
    });

    afterEach(() => {
        GlobalConfig.update({ customChatClient: null });
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    describe("suspendWebSocketConnection() (close the socket, keep the session)", () => {
        it("closes the actual socket and never calls disconnectParticipant", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();

            await session.suspendWebSocketConnection();

            expect(latestSocket().closeWebSocket).toHaveBeenCalledTimes(1);
            expect(client.count("disconnectParticipant")).toBe(0);
            expect(session.controller.isWebSocketSuspended()).toBe(true);
            expect(session.getChatDetails().connectionDetails).toBeNull();
            expect(LpcConnectionHelper.customerBaseInstances.cid).toBeUndefined();
        });

        it("stops token-refresh timers (stand-in credentials)", async () => {
            jest.useFakeTimers();
            const client = new TestClient({ expiresInMs: 2 * 60 * 1000 });   // refresh due after ~1 min
            const session = createSession(client);
            await session.connect();

            await session.suspendWebSocketConnection();
            jest.advanceTimersByTime(30 * 60 * 1000);
            await Promise.resolve();

            expect(client.count("createParticipantConnection")).toBe(1);
        });

        it("rejects calls that need the connection until resumed", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();

            await expect(session.sendMessage({ message: "x", contentType: "text/plain" })).rejects.toMatch(NO_CONNECTION);
            await expect(session.getTranscript()).rejects.toMatch(NO_CONNECTION);
            expect(client.count("sendMessage")).toBe(0);
        });

        it("keeps event handlers and the transcript across suspend and resume", async () => {
            const client = new TestClient();
            const session = createSession(client);
            const onMessage = jest.fn();
            session.onMessage(onMessage);
            session.onTranscriptUpdated(() => {});
            await session.connect();
            await session.getTranscript();
            const transcriptBefore = session.controller.internalTranscriptUtils.transcriptItems.length;

            await session.suspendWebSocketConnection();
            await session.resumeWebSocketConnection();
            latestSocket().$deliver(agentMessage("cid", "after-resume"));
            await new Promise(r => setTimeout(r, 0));

            // Handlers are called with (event, eventName, ...); check the event.
            expect(onMessage).toHaveBeenCalledTimes(1);
            expect(onMessage.mock.calls[0][0].data.Content).toBe("after-resume");
            expect(transcriptBefore).toBeGreaterThan(0);
            expect(session.controller.internalTranscriptUtils.transcriptItems.length).toBeGreaterThanOrEqual(transcriptBefore);
        });

        it("resume reconnects with fresh connection details on a new socket", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            const firstDetails = session.getChatDetails().connectionDetails;

            await session.suspendWebSocketConnection();
            const result = await session.resumeWebSocketConnection();

            expect(result.connectSuccess).toBe(true);
            expect(client.count("createParticipantConnection")).toBe(2);
            expect(sockets).toHaveLength(2);
            const freshDetails = session.getChatDetails().connectionDetails;
            expect(freshDetails).not.toBe(firstDetails);
            expect(freshDetails.connectionToken).toBeNull();          // still tokenless
            expect(session.controller.isWebSocketSuspended()).toBe(false);

            await session.sendMessage({ message: "hi", contentType: "text/plain" });
            expect(client.calls.find(c => c.method === "sendMessage").connectionToken).toBeNull();
        });

        it("resume without a prior suspend does nothing", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();

            const result = await session.resumeWebSocketConnection();

            expect(result).toEqual(expect.objectContaining({ connectSuccess: false, reason: "not suspended" }));
            expect(client.count("createParticipantConnection")).toBe(1);
        });

        it("is safe to call twice", async () => {
            const session = createSession(new TestClient());
            await session.connect();

            await session.suspendWebSocketConnection();
            await expect(session.suspendWebSocketConnection()).resolves.toBeUndefined();
        });

        it("abandons a connect() still in flight instead of opening a socket afterwards", async () => {
            const client = new TestClient();
            client.deferNextHandshake = true;
            const session = createSession(client);

            const connecting = session.connect();
            await session.suspendWebSocketConnection();
            client.releaseHandshake();

            await expect(connecting).rejects.toEqual(expect.objectContaining({ aborted: true, connectSuccess: false }));
            expect(sockets).toHaveLength(0);
            expect(session.getChatDetails().connectionDetails).toBeNull();

            await expect(session.resumeWebSocketConnection()).resolves.toEqual(expect.objectContaining({ connectSuccess: true }));
        });

        it("never resolves to an unhandled rejection when closing the socket throws", async () => {
            const session = createSession(new TestClient());
            await session.connect();
            jest.spyOn(session.controller.connectionHelper, "forceClose").mockImplementation(() => { throw new Error("boom"); });

            await expect(session.suspendWebSocketConnection()).resolves.toBeUndefined();
            expect(session.controller.isWebSocketSuspended()).toBe(true);
        });

        it("closes a socket shared by two sessions on the same contact, and suspends both", async () => {
            const a = createSession(new TestClient(), "cid");
            const b = createSession(new TestClient(), "cid");
            await a.connect();
            await b.connect();
            expect(sockets).toHaveLength(1);

            await a.suspendWebSocketConnection();

            expect(sockets[0].closeWebSocket).toHaveBeenCalledTimes(1);
            expect(b.controller.isWebSocketSuspended()).toBe(true);
            await expect(b.sendMessage({ message: "x", contentType: "text/plain" })).rejects.toMatch(NO_CONNECTION);
            await expect(b.resumeWebSocketConnection()).resolves.toEqual(expect.objectContaining({ connectSuccess: true }));
        });

        it("delivers no further messages once suspended", async () => {
            const session = createSession(new TestClient());
            const onMessage = jest.fn();
            session.onMessage(onMessage);
            await session.connect();
            const socket = latestSocket();

            await session.suspendWebSocketConnection();
            socket.$deliver(agentMessage("cid", "late"));
            await new Promise(r => setTimeout(r, 0));

            expect(onMessage).not.toHaveBeenCalled();
        });

        it("can retry resume after a failed handshake", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();

            client.failNextHandshake = true;
            await expect(session.resumeWebSocketConnection()).rejects.toEqual(expect.objectContaining({ connectSuccess: false }));
            expect(session.controller.isWebSocketSuspended()).toBe(true);

            await expect(session.resumeWebSocketConnection()).resolves.toEqual(expect.objectContaining({ connectSuccess: true }));
            expect(client.count("createParticipantConnection")).toBe(3);
        });

        it("shares one attempt between concurrent resume calls", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();

            const first = session.resumeWebSocketConnection();
            const second = session.resumeWebSocketConnection();

            expect(second).toBe(first);
            await first;
            expect(client.count("createParticipantConnection")).toBe(2);
        });

        it("abandons a resume that a later suspend overtakes", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();
            client.deferNextHandshake = true;

            const resuming = session.resumeWebSocketConnection();
            await session.suspendWebSocketConnection();
            client.releaseHandshake();

            await expect(resuming).rejects.toEqual(expect.objectContaining({ aborted: true }));
            expect(session.controller.isWebSocketSuspended()).toBe(true);
        });

        it("treats a direct connect() while suspended as a resume", async () => {
            const session = createSession(new TestClient());
            await session.connect();
            await session.suspendWebSocketConnection();

            await expect(session.connect()).resolves.toEqual(expect.objectContaining({ connectSuccess: true }));
            expect(session.controller.getSessionState()).toBe("CONNECTED");
        });

        it("refuses to reopen a closed socket, e.g. when a mobile tab is foregrounded", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            const reopen = latestSocket().init.mock.calls[0][0];

            await session.suspendWebSocketConnection();

            await expect(reopen()).rejects.toEqual(expect.objectContaining({ reason: expect.stringMatching(/closed by ChatJS/) }));
            expect(client.count("createParticipantConnection")).toBe(1);
        });

        it("notifies every session on the contact with CONNECTION_SUSPENDED", async () => {
            const a = createSession(new TestClient(), "cid");
            const b = createSession(new TestClient(), "cid");
            const onA = jest.fn();
            const onB = jest.fn();
            a.onConnectionSuspended(onA);
            b.onConnectionSuspended(onB);
            await a.connect();
            await b.connect();

            await a.suspendWebSocketConnection();
            await new Promise(r => setTimeout(r, 0));

            expect(onA).toHaveBeenCalledTimes(1);
            expect(onA.mock.calls[0][0].data).toEqual({ suspendedBy: "this session" });
            expect(onB).toHaveBeenCalledTimes(1);
            expect(onB.mock.calls[0][0].data).toEqual({ suspendedBy: "another session on this contact" });
        });

        it.each([
            ["a custom client's 403", { statusCode: 403, message: "Forbidden" }],
            ["the AWS client's AccessDeniedException", { type: "AccessDeniedException", statusCode: 403 }]
        ])("ends the session when resume fails because the chat ended (%s)", async (_, error) => {
            const client = new TestClient();
            const session = createSession(client);
            const onEnded = jest.fn();
            session.onEnded(onEnded);
            await session.connect();
            await session.suspendWebSocketConnection();

            client.failNextHandshake = error;
            await expect(session.resumeWebSocketConnection()).rejects.toEqual(expect.objectContaining({ chatEnded: true }));
            await new Promise(r => setTimeout(r, 0));

            expect(session.controller.getSessionState()).toBe("ENDED");
            expect(onEnded).toHaveBeenCalledTimes(1);
        });

        it("keeps the session suspended when resume fails for another reason", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();

            client.failNextHandshake = { statusCode: 500, message: "Internal error" };
            await expect(session.resumeWebSocketConnection()).rejects.not.toHaveProperty("chatEnded");

            expect(session.controller.isWebSocketSuspended()).toBe(true);
        });

        it("only affects its own session when a global customChatClient is shared", async () => {
            const shared = new TestClient();
            GlobalConfig.update({ customChatClient: shared });
            const a = createSession(null, "cid-a");
            const b = createSession(null, "cid-b");
            await a.connect();
            await b.connect();

            await a.suspendWebSocketConnection();
            await b.sendMessage({ message: "from b", contentType: "text/plain" });

            expect(b.controller.isWebSocketSuspended()).toBe(false);
            expect(shared.calls.some(c => c.method === "sendMessage" && c.content === "from b")).toBe(true);
            expect(shared.count("disconnectParticipant")).toBe(0);
            expect(LpcConnectionHelper.customerBaseInstances["cid-b"]).toBeDefined();
        });
    });

    // Customers without a customChatClient must see exactly master's behavior.
    describe("no change for the bundled AWS client", () => {
        const WS_DATA = { Websocket: { Url: WS_URL, ConnectionExpiry: new Date(Date.now() + 3600000).toISOString() },
            ConnectionCredentials: { ConnectionToken: "real-token", Expiry: new Date(Date.now() + 3600000).toISOString() } };

        function createBundledSession() {
            const session = ChatSessionObject.create({
                chatDetails: { contactId: "cid", participantId: "pid", participantToken: "ptoken" },
                options: { region: "us-west-2" },
                type: ChatSessionObject.SessionTypes.CUSTOMER,
                disableCSM: true
            });
            const aws = session.controller.chatClient;
            jest.spyOn(aws, "createParticipantConnection").mockResolvedValue({ data: WS_DATA });
            jest.spyOn(aws, "getTranscript").mockResolvedValue({ data: { InitialContactId: "cid", Transcript: [] } });
            jest.spyOn(aws, "sendMessage").mockResolvedValue({ data: { Id: "m", AbsoluteTime: "t" } });
            return { session, aws };
        }

        const chatEnded = { Id: "end", Type: "EVENT", ContentType: "application/vnd.amazonaws.connect.event.chat.ended", ContactId: "cid", InitialContactId: "cid" };

        it("still allows API calls from an onEnded() handler", async () => {
            const { session } = createBundledSession();
            let fromHandler;
            session.onEnded(() => { fromHandler = session.getTranscript(); });
            await session.connect();

            latestSocket().$deliver(chatEnded);
            await new Promise(r => setTimeout(r, 0));

            await expect(fromHandler).resolves.toEqual(expect.objectContaining({ data: expect.any(Object) }));
        });

        it("clears the ended state when the connection is regained, like hasChatEnded", async () => {
            const { session } = createBundledSession();
            await session.connect();
            latestSocket().$deliver(chatEnded);

            session.controller._handleGainedConnection({});

            expect(session.controller.hasChatEnded).toBe(false);
            expect(session.controller.getSessionState()).not.toBe("ENDED");
        });

        it("ignores connect() after the chat ended", async () => {
            const { session } = createBundledSession();
            await session.connect();
            latestSocket().$deliver(chatEnded);

            expect(session.connect()).toBeUndefined();
        });

        it("ignores a second connect() after a failed one", async () => {
            const { session, aws } = createBundledSession();
            aws.createParticipantConnection.mockRejectedValueOnce({ statusCode: 500, message: "boom" });

            await expect(session.connect()).rejects.toEqual(expect.objectContaining({ connectSuccess: false }));

            expect(session.connect()).toBeUndefined();
            expect(aws.createParticipantConnection).toHaveBeenCalledTimes(1);
        });

        it("lets invalid arguments throw synchronously", async () => {
            const { session } = createBundledSession();
            await session.connect();

            expect(() => session.sendMessage({ contentType: "text/plain" })).toThrow();
        });

        it("lets a synchronous throw from the client escape synchronously", async () => {
            const { session, aws } = createBundledSession();
            await session.connect();
            aws.sendMessage.mockImplementation(() => { throw new Error("sync"); });

            expect(() => session.sendMessage({ message: "x", contentType: "text/plain" })).toThrow("sync");
        });

        it("does not refuse a reconnect after a normal end of the connection", async () => {
            const { session, aws } = createBundledSession();
            await session.connect();
            const reopen = latestSocket().init.mock.calls[0][0];

            await reopen();                       // first call reuses the details from connect()
            session.controller.breakConnection();

            await expect(reopen()).resolves.toBeDefined();
            expect(aws.createParticipantConnection).toHaveBeenCalledTimes(2);
        });
    });

    describe("reset() (full teardown)", () => {
        it("closes the socket, never calls disconnectParticipant, and clears all session state", async () => {
            const client = new TestClient();
            const session = createSession(client);
            const onMessage = jest.fn();
            session.onMessage(onMessage);
            session.onTranscriptUpdated(() => {});
            await session.connect();
            await session.getTranscript();
            const socket = latestSocket();

            await session.reset();

            expect(socket.closeWebSocket).toHaveBeenCalled();
            expect(client.count("disconnectParticipant")).toBe(0);
            expect(session.controller.getSessionState()).toBe("RESET");
            expect(session.getChatDetails().connectionDetails).toBeNull();
            expect(session.getChatDetails().participantToken).toBeNull();
            expect(session.controller.chatClient).toBeNull();
            expect(session.controller.internalTranscriptUtils.transcriptItems).toEqual([]);
            expect(session.controller.transcriptUpdateEnabled).toBe(false);
            expect(LpcConnectionHelper.customerBaseInstances.cid).toBeUndefined();

            socket.$deliver(agentMessage("cid", "after-reset"));
            await new Promise(r => setTimeout(r, 0));
            expect(onMessage).not.toHaveBeenCalled();
        });

        it("refuses to reopen the socket after reset", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            const reopen = latestSocket().init.mock.calls[0][0];

            await session.reset();

            await expect(reopen()).rejects.toEqual(expect.objectContaining({ reason: expect.stringMatching(/closed by ChatJS/) }));
            expect(client.count("createParticipantConnection")).toBe(1);
        });

        it("rejects every later call with CHAT_SESSION_RESET, and a second reset is a no-op", async () => {
            const session = createSession(new TestClient());
            await session.connect();
            await session.reset();

            const reset = { code: "CHAT_SESSION_RESET" };
            await expect(session.connect()).rejects.toMatchObject(reset);
            await expect(session.sendMessage({ message: "x", contentType: "text/plain" })).rejects.toMatchObject(reset);
            await expect(session.getTranscript()).rejects.toMatchObject(reset);
            await expect(session.disconnectParticipant()).rejects.toMatchObject(reset);
            await expect(session.suspendWebSocketConnection()).rejects.toMatchObject(reset);
            await expect(session.resumeWebSocketConnection()).rejects.toMatchObject(reset);
            await expect(session.reset()).resolves.toBeUndefined();
        });

        it("lets a call already in flight settle as before, and rejects later calls", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            client.deferNextTranscript = true;

            const transcript = session.getTranscript();
            await Promise.resolve();
            await session.reset();
            client.releaseTranscript();

            await expect(transcript).resolves.toBeDefined();
            await expect(session.getTranscript()).rejects.toMatchObject({ code: "CHAT_SESSION_RESET" });
        });

        it("lets a late transcript response resolve without repopulating the cleared session state", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            session.controller.transcriptUpdateEnabled = true;
            let releaseTranscript;
            client.getTranscript = jest.fn(() => new Promise(resolve => { releaseTranscript = resolve; }));

            const transcript = session.getTranscript();
            await Promise.resolve();
            await session.reset();
            releaseTranscript({
                data: {
                    Transcript: [
                        { Id: "late-message", Type: "MESSAGE", ContentType: "text/plain", Content: "secret", AbsoluteTime: "2026-01-01T00:00:00.000Z" },
                        {
                            Id: "metadata",
                            Type: "MESSAGEMETADATA",
                            MessageMetadata: {
                                MessageId: "late-message",
                                Receipts: [{
                                    DeliveredTimestamp: "2026-01-01T00:00:00.000Z",
                                    ReadTimestamp: "2026-01-01T00:00:01.000Z"
                                }]
                            }
                        }
                    ]
                }
            });

            await expect(transcript).resolves.toBeDefined();
            const { messageReceiptUtil, internalTranscriptUtils, partialMessageUtil } = session.controller;
            expect(messageReceiptUtil.readSet.size).toBe(0);
            expect(messageReceiptUtil.deliveredSet.size).toBe(0);
            expect(internalTranscriptUtils.transcriptItems).toHaveLength(0);
            expect(partialMessageUtil.partialMessageMap.size).toBe(0);
        });

        it("stays reset when a queued chat-ended callback runs after reset", async () => {
            const session = createSession(new TestClient());
            await session.connect();

            latestSocket().$deliver({ Id: "end", Type: "EVENT", ContentType: "application/vnd.amazonaws.connect.event.chat.ended", ContactId: "cid", InitialContactId: "cid" });
            await session.reset();
            await new Promise(r => setTimeout(r, 0));

            expect(session.controller.getSessionState()).toBe("RESET");
            await expect(session.getTranscript()).rejects.toMatchObject({ code: "CHAT_SESSION_RESET" });
        });

        it("leaves a global customChatClient in place, so a new session without its own client reuses it", async () => {
            const shared = new TestClient();
            GlobalConfig.update({ customChatClient: shared });
            const first = createSession(null, "cid-1");
            await first.connect();

            await first.reset();
            const next = createSession(null, "cid-2");

            expect(first.controller.chatClient).toBeNull();
            expect(next.controller.chatClient).toBe(shared);
        });

        it("allows a new session to opt out of a global customChatClient explicitly", async () => {
            const shared = new TestClient();
            GlobalConfig.update({ customChatClient: shared });
            const authenticated = createSession(null, "cid-auth");
            await authenticated.connect();
            await authenticated.reset();

            const anonymous = ChatSessionObject.create({
                chatDetails: {
                    contactId: "cid-anon",
                    participantId: "p-cid-anon",
                    participantToken: "anonymous-participant-token"
                },
                options: { customChatClient: null },
                type: ChatSessionObject.SessionTypes.CUSTOMER,
                disableCSM: true
            });

            expect(anonymous.controller.chatClient).not.toBe(shared);
            expect(anonymous.controller.usingCustomChatClient).toBe(false);
        });

        it("abandons a connect() still in flight", async () => {
            const client = new TestClient();
            client.deferNextHandshake = true;
            const session = createSession(client);

            const connecting = session.connect();
            await session.reset();
            client.releaseHandshake();

            await expect(connecting).rejects.toMatchObject({ code: "CHAT_SESSION_RESET" });
            expect(sockets).toHaveLength(0);
        });

        it("keeps connect() after the server has ended the chat as on master, but rejects suspend and resume", async () => {
            const session = createSession(new TestClient());
            await session.connect();
            latestSocket().$deliver({
                Id: "end",
                Type: "EVENT",
                ContentType: "application/vnd.amazonaws.connect.event.chat.ended",
                ContactId: "cid",
                InitialContactId: "cid"
            });

            expect(session.controller.getSessionState()).toBe("ENDED");
            expect(session.connect()).toBeUndefined();   // "Ignoring duplicate call to connect", as on master
            await expect(session.suspendWebSocketConnection()).rejects.toMatchObject({ name: "IllegalState" });
            await expect(session.resumeWebSocketConnection()).rejects.toMatchObject({ name: "IllegalState" });
        });

        it("works from a suspended session, which then cannot be resumed", async () => {
            const client = new TestClient();
            const session = createSession(client);
            await session.connect();
            await session.suspendWebSocketConnection();

            await session.reset();

            expect(session.controller.isWebSocketSuspended()).toBe(false);
            await expect(session.resumeWebSocketConnection()).rejects.toMatchObject({ code: "CHAT_SESSION_RESET" });
            expect(client.count("createParticipantConnection")).toBe(1);
        });

        it("a new session after reset sees nothing from the previous one", async () => {
            const authenticated = createSession(new TestClient(), "cid-auth");
            const oldHandler = jest.fn();
            authenticated.onMessage(oldHandler);
            await authenticated.connect();
            await authenticated.reset();

            const anonymous = createSession(new TestClient(), "cid-anon");
            const newHandler = jest.fn();
            anonymous.onMessage(newHandler);
            await anonymous.connect();
            latestSocket().$deliver(agentMessage("cid-anon", "hello"));
            await new Promise(r => setTimeout(r, 0));

            expect(newHandler).toHaveBeenCalledTimes(1);
            expect(oldHandler).not.toHaveBeenCalled();
            expect(anonymous.getChatDetails().contactId).toBe("cid-anon");
            expect(LpcConnectionHelper.customerBaseInstances["cid-auth"]).toBeUndefined();
        });
    });
});
