import LpcConnectionHelper from "./LpcConnectionHelper";
import WebSocketManager from "../../lib/amazon-connect-websocket-manager";
import { ConnectionHelperStatus } from "./baseConnectionHelper";
import { csmService } from "../../service/csmService";
import { CSM_CATEGORY, WEBSOCKET_EVENTS, CHAT_EVENTS } from "../../constants";

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("LpcConnectionHelper", () => {

    let connectionDetailsProvider = {
        fetchConnectionDetails: () => { },
    };

    let autoCreatedWebsocketManager;
    const connectionDetailsMock = {
        url: "existingUrl",
        expiry: "existingExpiry",
        connectionTokenExpiry: "connectionTokenExpiry",
        connectionToken: "existingToken"
    };

    function createWebsocketManager() {
        const messageHandlers = [];
        const connectionLostHandlers = [];
        const connectionGainHandlers = [];
        const endedHandlers = [];
        const refreshHandlers = [];
        const deepHeartbeatSuccessHandlers = [];
        const deepHeartbeatFailureHandlers = [];

        return {
            subscribeTopics: jest.fn(() => { }),
            onMessage: jest.fn((topic, handler) => {
                messageHandlers.push(handler);
                return () => { };
            }),
            onConnectionGain: jest.fn((handler) => {
                connectionGainHandlers.push(handler);
                return () => { };
            }),
            onConnectionLost: jest.fn((handler) => {
                connectionLostHandlers.push(handler);
                return () => { };
            }),
            onDeepHeartbeatSuccess: jest.fn((handler) => {
                deepHeartbeatSuccessHandlers.push(handler);
                return () => { };
            }),
            onDeepHeartbeatFailure: jest.fn((handler) => {
                deepHeartbeatFailureHandlers.push(handler);
                return () => { };
            }),
            onInitFailure: jest.fn((handler) => {
                endedHandlers.push(handler);
                return () => { };
            }),
            init: jest.fn((dataProvider) => {
                refreshHandlers.push(dataProvider);
            }),
            $simulateMessage(message) {
                messageHandlers.forEach(f => f(message));
            },
            $simulateConnectionLost() {
                connectionLostHandlers.forEach(f => f());
            },
            $simulateConnectionGain() {
                connectionGainHandlers.forEach(f => f());
            },
            $simulateDeepHeartbeatSuccess() {
                deepHeartbeatSuccessHandlers.forEach(f => f());
            },
            $simulateDeepHeartbeatFailure() {
                deepHeartbeatFailureHandlers.forEach(f => f());
            },
            $simulateEnded() {
                endedHandlers.forEach(f => f());
            },
            $simulateRefresh() {
                return Promise.all(refreshHandlers.map(f => f().then(
                    value => ({ status: 'fulfilled', value }),
                    reason => ({ status: 'rejected', reason }),
                )));
            }
        };
    }

    beforeEach(() => {
        jest.resetAllMocks();
	     jest.spyOn(csmService, 'addCountMetric').mockImplementation(() => {});
        connectionDetailsProvider.fetchConnectionDetails = jest.fn(() => Promise.resolve({
            url: "url",
            expiry: "expiry",
            connectionToken: "token"
        }));
        connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => Promise.resolve("expiry"));
        LpcConnectionHelper.agentBaseInstance = null;
        LpcConnectionHelper.customerBaseInstances = {};
        const mock = jest.spyOn(WebSocketManager, 'create');
        mock.mockImplementation(() => {
            autoCreatedWebsocketManager = createWebsocketManager();
            return autoCreatedWebsocketManager;
        });
    });

    function getLpcConnectionHelper(initialContactId, websocketManager, connectionDetails) {
        return new LpcConnectionHelper(initialContactId, initialContactId, connectionDetailsProvider, websocketManager, {}, connectionDetails);
    }

    describe("Connections with provided WebsocketManager (agent connections)", () => {
        test("call relevant methods on provided WebsocketManager during initialization", () => {
            const websocketManager = createWebsocketManager();
            getLpcConnectionHelper("id", websocketManager).start();
            expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
            expect(websocketManager.subscribeTopics).toHaveBeenCalledWith(["aws/chat"]);
            expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
            expect(websocketManager.onMessage).toHaveBeenCalledWith("aws/chat", expect.any(Function));
            expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
            expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
            expect(websocketManager.onDeepHeartbeatSuccess).toHaveBeenCalledTimes(1);
            expect(websocketManager.onDeepHeartbeatFailure).toHaveBeenCalledTimes(1);
        });

        test("WebsocketManager will only be initialized once", () => {
            const websocketManager = createWebsocketManager();
            getLpcConnectionHelper("id1", websocketManager).start();
            getLpcConnectionHelper("id2", websocketManager).start();
            expect(websocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
            expect(websocketManager.onMessage).toHaveBeenCalledTimes(1);
            expect(websocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
            expect(websocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
            expect(websocketManager.onDeepHeartbeatSuccess).toHaveBeenCalledTimes(1);
            expect(websocketManager.onDeepHeartbeatFailure).toHaveBeenCalledTimes(1);
        });

        test("onConnectionLost handler is called", () => {
            const websocketManager = createWebsocketManager();
            const onConnectionLostHandler1 = jest.fn();
            const onConnectionLostHandler2 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onConnectionLost(onConnectionLostHandler1);
            getLpcConnectionHelper("id2", websocketManager).onConnectionLost(onConnectionLostHandler2);
            websocketManager.$simulateConnectionLost();
            expect(onConnectionLostHandler1).toHaveBeenCalledTimes(1);
            expect(onConnectionLostHandler2).toHaveBeenCalledTimes(1);
        });

        test("onConnectionGain handler is called", () => {
            const websocketManager = createWebsocketManager();
            const onConnectionGainHandler1 = jest.fn();
            const onConnectionGainHandler2 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onConnectionGain(onConnectionGainHandler1);
            getLpcConnectionHelper("id2", websocketManager).onConnectionGain(onConnectionGainHandler2);
            websocketManager.$simulateConnectionGain();
            expect(onConnectionGainHandler1).toHaveBeenCalledTimes(1);
            expect(onConnectionGainHandler2).toHaveBeenCalledTimes(1);
        });

        test("onDeepHeartbeatSuccess handler is called", () => {
            const websocketManager = createWebsocketManager();
            const onDeepHeartbeatSuccessHandler1 = jest.fn();
            const onDeepHeartbeatSuccessHandler2 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onDeepHeartbeatSuccess(onDeepHeartbeatSuccessHandler1);
            getLpcConnectionHelper("id2", websocketManager).onDeepHeartbeatSuccess(onDeepHeartbeatSuccessHandler2);
            websocketManager.$simulateDeepHeartbeatSuccess();
            expect(onDeepHeartbeatSuccessHandler1).toHaveBeenCalledTimes(1);
            expect(onDeepHeartbeatSuccessHandler2).toHaveBeenCalledTimes(1);
        });

        test("onDeepHeartbeatFailure handler is called", () => {
            const websocketManager = createWebsocketManager();
            const onDeepHeartbeatFailureHandler1 = jest.fn();
            const onDeepHeartbeatFailureHandler2 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onDeepHeartbeatFailure(onDeepHeartbeatFailureHandler1);
            getLpcConnectionHelper("id2", websocketManager).onDeepHeartbeatFailure(onDeepHeartbeatFailureHandler2);
            websocketManager.$simulateDeepHeartbeatFailure();
            expect(onDeepHeartbeatFailureHandler1).toHaveBeenCalledTimes(1);
            expect(onDeepHeartbeatFailureHandler2).toHaveBeenCalledTimes(1);
        });

        test("onMessage handler is called", () => {
            const websocketManager = createWebsocketManager();
            const onMessageHandler1 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onMessage(onMessageHandler1);
            websocketManager.$simulateMessage({ content: JSON.stringify({ InitialContactId: "id1" }) });
            websocketManager.$simulateMessage({ content: JSON.stringify({ Type: CHAT_EVENTS.MESSAGE_METADATA }) });
            expect(onMessageHandler1).toHaveBeenCalledTimes(2);
            expect(onMessageHandler1).toHaveBeenCalledWith({ InitialContactId: "id1" }, expect.anything(), expect.anything());
            expect(onMessageHandler1).toHaveBeenCalledWith({ Type: CHAT_EVENTS.MESSAGE_METADATA }, expect.anything(), expect.anything());
        });

        test("onEnded handler called for multiple connections using the same websocket manager", () => {
            const websocketManager = createWebsocketManager();
            const onEndedHandler1 = jest.fn();
            const onEndedHandler2 = jest.fn();
            getLpcConnectionHelper("id1", websocketManager).onEnded(onEndedHandler1);
            getLpcConnectionHelper("id2", websocketManager).onEnded(onEndedHandler2);
            websocketManager.$simulateEnded();
            expect(onEndedHandler1).toHaveBeenCalledTimes(1);
            expect(onEndedHandler2).toHaveBeenCalledTimes(1);
        });

        test("Connections using different WebsocketManager instances", () => {
            const onWebsocketClosed1 = jest.fn();
            const websocketManager1 = createWebsocketManager();
            const websocketManager2 = createWebsocketManager();
            websocketManager1.closeWebSocket = onWebsocketClosed1;

            // create first connection
            getLpcConnectionHelper("id1", websocketManager1);

            // the first should not have closed
            expect(onWebsocketClosed1).toHaveBeenCalledTimes(0);

            // create second connection
            getLpcConnectionHelper("id2", websocketManager2);

            // the first should have auto closed
            expect(onWebsocketClosed1).toHaveBeenCalledTimes(1);
        });
    });

    describe("Connections with auto-created WebsocketManager (customer connections)", () => {
        test("onRefresh handler is called with error", () => {
            connectionDetailsProvider.fetchConnectionDetails =
        jest.fn(() => Promise.reject(new Error("error")));
            getLpcConnectionHelper("id");
            autoCreatedWebsocketManager.$simulateRefresh().then(initResults => {
                expect(initResults[0].status).toStrictEqual('rejected');
            });
            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
        });

        test("call relevant methods on new WebsocketManager during initialization", () => {
            const lpcConnectionHelperInstance = getLpcConnectionHelper("id", undefined, connectionDetailsMock);
            lpcConnectionHelperInstance.start();
            expect(lpcConnectionHelperInstance.customerConnection).toEqual(true);
            const lpcConnectionHelperBaseInstance = LpcConnectionHelper.customerBaseInstances["id"];
            expect(lpcConnectionHelperBaseInstance.initialConnectionDetails).toEqual({"connectionToken": "existingToken", "connectionTokenExpiry": "connectionTokenExpiry", "expiry": "existingExpiry", "url": "existingUrl"});
            autoCreatedWebsocketManager.$simulateRefresh().then(() => {
                expect(lpcConnectionHelperBaseInstance.initialConnectionDetails).toEqual(null);
            });
            expect(autoCreatedWebsocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.subscribeTopics).toHaveBeenCalledWith(["aws/chat"]);
            expect(autoCreatedWebsocketManager.onMessage).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onMessage).toHaveBeenCalledWith("aws/chat", expect.any(Function));
            expect(autoCreatedWebsocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onDeepHeartbeatSuccess).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onDeepHeartbeatFailure).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.init).toHaveBeenCalledTimes(1);
        });

        test("Created WebsocketManager will only be initialized once", () => {
            getLpcConnectionHelper("id1").start();
            const createdWebsocketManager = autoCreatedWebsocketManager;
            getLpcConnectionHelper("id1").start();
            expect(createdWebsocketManager.subscribeTopics).toHaveBeenCalledTimes(1);
            expect(createdWebsocketManager.onMessage).toHaveBeenCalledTimes(1);
            expect(createdWebsocketManager.onConnectionGain).toHaveBeenCalledTimes(1);
            expect(createdWebsocketManager.onConnectionLost).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onDeepHeartbeatSuccess).toHaveBeenCalledTimes(1);
            expect(autoCreatedWebsocketManager.onDeepHeartbeatFailure).toHaveBeenCalledTimes(1);
            expect(createdWebsocketManager.init).toHaveBeenCalledTimes(1);
        });

        test("onEnded handler is called properly", () => {
            const onEndedHandler1 = jest.fn();
            const onEndedHandler2 = jest.fn();
            getLpcConnectionHelper("id1").onEnded(onEndedHandler1);
            const createdWebsocketManager1 = autoCreatedWebsocketManager;
            getLpcConnectionHelper("id2").onEnded(onEndedHandler2);
            const createdWebsocketManager2 = autoCreatedWebsocketManager;

            // simulate 1 ending
            createdWebsocketManager1.$simulateEnded();
            expect(onEndedHandler1).toHaveBeenCalledTimes(1);
            expect(onEndedHandler2).toHaveBeenCalledTimes(0);

            // simulate 2 ending
            createdWebsocketManager2.$simulateEnded();
            expect(onEndedHandler1).toHaveBeenCalledTimes(1);
            expect(onEndedHandler2).toHaveBeenCalledTimes(1);

            expect(csmService.addCountMetric).toHaveBeenCalledTimes(2);
	       expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.Ended, CSM_CATEGORY.API);
        });

        test("onConnectionLost handler is called", () => {
            const onConnectionLostHandler = jest.fn();
            getLpcConnectionHelper("id1").onConnectionLost(onConnectionLostHandler);
            const createdWebsocketManager = autoCreatedWebsocketManager;
            createdWebsocketManager.$simulateConnectionLost();
            expect(onConnectionLostHandler).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.ConnectionLost, CSM_CATEGORY.API);
        });

        test("onConnectionGain handler is called", () => {
            const onConnectionGainHandler = jest.fn();
            getLpcConnectionHelper("id1").onConnectionGain(onConnectionGainHandler);
            const createdWebsocketManager = autoCreatedWebsocketManager;
            createdWebsocketManager.$simulateConnectionGain();
            expect(onConnectionGainHandler).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.ConnectionGained, CSM_CATEGORY.API);
        });

        test("onDeepHeartbeatSuccess handler is called", () => {
            const onDeepHeartbeatSuccessHandler = jest.fn();
            getLpcConnectionHelper("id1").onDeepHeartbeatSuccess(onDeepHeartbeatSuccessHandler);
            const createdWebsocketManager = autoCreatedWebsocketManager;
            createdWebsocketManager.$simulateDeepHeartbeatSuccess();
            expect(onDeepHeartbeatSuccessHandler).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.DeepHeartbeatSuccess, CSM_CATEGORY.API);
        });

        test("onDeepHeartbeatFailure handler is called", () => {
            const onDeepHeartbeatFailureHandler = jest.fn();
            getLpcConnectionHelper("id1").onDeepHeartbeatFailure(onDeepHeartbeatFailureHandler);
            const createdWebsocketManager = autoCreatedWebsocketManager;
            createdWebsocketManager.$simulateDeepHeartbeatFailure();
            expect(onDeepHeartbeatFailureHandler).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.DeepHeartbeatFailure, CSM_CATEGORY.API);
        });

        test("onMessage handler is called", () => {
            const onMessageHandler = jest.fn();
            getLpcConnectionHelper("id1").onMessage(onMessageHandler);
            const createdWebsocketManager = autoCreatedWebsocketManager;
            createdWebsocketManager.$simulateMessage({ content: JSON.stringify({ InitialContactId: "id1" }) });
            expect(onMessageHandler).toHaveBeenCalledTimes(1);
            expect(onMessageHandler).toHaveBeenCalledWith({ InitialContactId: "id1" }, expect.anything(), expect.anything());
            expect(csmService.addCountMetric).toHaveBeenCalledTimes(1);
            expect(csmService.addCountMetric).toHaveBeenCalledWith(WEBSOCKET_EVENTS.IncomingMessage, CSM_CATEGORY.API);
        });

        test("onRefresh handler is called", () => {
            getLpcConnectionHelper("id");
            autoCreatedWebsocketManager.$simulateRefresh();
            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
        });

        test("Connections using the same contact id", () => {
            const connectionHelper1 = getLpcConnectionHelper("id");
            const baseInstance1 = connectionHelper1.baseInstance;
            const connectionHelper2 = getLpcConnectionHelper("id");
            const baseInstance2 = connectionHelper2.baseInstance;

            // same contact id should use the same base instance
            expect(baseInstance1).toBe(baseInstance2);

            const onWebsocketClosed = jest.fn();
            autoCreatedWebsocketManager.closeWebSocket = onWebsocketClosed;

            connectionHelper1.end();
            expect(onWebsocketClosed).toHaveBeenCalledTimes(0);
            connectionHelper2.end();
            expect(onWebsocketClosed).toHaveBeenCalledTimes(1);
        });

        test("getStatus calls are successful", () => {
            const connectionHelper = getLpcConnectionHelper("id");
            expect(connectionHelper.getStatus()).toBe(ConnectionHelperStatus.NeverStarted);
            connectionHelper.start();
            expect(connectionHelper.getStatus()).toBe(ConnectionHelperStatus.Starting);
            connectionHelper.end();
            expect(connectionHelper.getStatus()).toBe(ConnectionHelperStatus.Ended);
        });

        test("BackgroundChatEnded handler is called", async () => {
            const error = new Error("error");
            error._debug = { statusCode: 403};
            connectionDetailsProvider.fetchConnectionDetails = jest.fn(() => Promise.reject(error));
            const onBackgroundChatEndedHandler = jest.fn();
            getLpcConnectionHelper("id1").onBackgroundChatEnded(onBackgroundChatEndedHandler);
            autoCreatedWebsocketManager.$simulateConnectionLost();
            autoCreatedWebsocketManager.$simulateRefresh();
            await timeout(100);
            expect(onBackgroundChatEndedHandler).toHaveBeenCalledTimes(1);
        });
    });
});
