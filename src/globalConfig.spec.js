import { ChatSessionObject } from "./core/chatSession";
import { LogLevel, LogManager } from "./log";
import { GlobalConfig } from "./globalConfig";
import { FEATURES } from "./constants";
import WebSocketManager from "./lib/amazon-connect-websocket-manager";

const realDate = Date.now;
const fixDate = "2022-04-12T23:12:36.677Z";

var testLogger;

const originDebug = console.debug;
const originInfo = console.info;
const originWarn = console.warn;
const originError = console.error;

const stageRegionCell = {
    stage: "test-stage",
    region: "test-region",
    cell: "test-cell",
};
const stageRegionCell2 = {
    stage: "test-stage2",
    region: "test-region2",
    cell: "test-cell2",
};

const configInput = {
    ...stageRegionCell,
    endpoint: "test-endpoint",
    regionOverride: "test-regionOverride",
    customUserAgentSuffix: "test-customUserAgentOverride"
};
const logMetaData = {contactId: "abc"};
const defaultMessageReceiptsError = "WARN [2022-04-12T23:12:36.677Z] ChatJS-GlobalConfig: enabling message-receipts by default; to disable set config.features.messageReceipts.shouldSendMessageReceipts = false ";

describe("globalConfig", () => {
    beforeAll(() => {
        global.Date.now = jest.fn(() => new Date(fixDate).getTime());
    });
  
    afterAll(() => {
        global.Date.now = realDate;
        console.info = originInfo;
        console.debug = originDebug;
        console.warn = originWarn;
        console.error = originError;
  
    });
  
    describe("Common globalConfig tests", () => {
        it("should already have its class variables initialized to defaults without any other method having been invoked", () => {
            expect(GlobalConfig.cell).toEqual("1");
            expect(GlobalConfig.region).toEqual("us-west-2");
            expect(GlobalConfig.stage).toEqual("prod");
            expect(GlobalConfig.reconnect).toBe(true);
        });
        it("should update all and fetch correct config", () => {
            GlobalConfig.update(configInput);
            GlobalConfig.updateRegionOverride(configInput.regionOverride);
            expect(GlobalConfig.getStage()).toEqual(configInput.stage);
            expect(GlobalConfig.getRegion()).toEqual(configInput.region);
            expect(GlobalConfig.getRegionOverride()).toEqual(configInput.regionOverride);
            expect(GlobalConfig.getCell()).toEqual(configInput.cell);
            expect(GlobalConfig.getEndpointOverride()).toEqual(configInput.endpoint);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(true);
            expect(GlobalConfig.getCustomUserAgentSuffix()).toEqual(configInput.customUserAgentSuffix);
        });
        it("should update stage, region and cell and fetch correct config", () => {
            GlobalConfig.updateStageRegionCell(stageRegionCell);
            expect(GlobalConfig.getStage()).toEqual(stageRegionCell.stage);
            expect(GlobalConfig.getRegion()).toEqual(stageRegionCell.region);
            expect(GlobalConfig.getCell()).toEqual(stageRegionCell.cell);
        });
        it("updateStageRegionCell should not update any class variables if the input object does not contain any of those fields", () => {
            GlobalConfig.updateStageRegionCell(stageRegionCell2);
            GlobalConfig.updateStageRegionCell({beep: "boop"});
            expect(GlobalConfig.cell).toEqual(stageRegionCell2.cell);
            expect(GlobalConfig.region).toEqual(stageRegionCell2.region);
            expect(GlobalConfig.stage).toEqual(stageRegionCell2.stage);
        });
    });
  
    describe("About using default logger", () => {
        let messages;
        let mockFn;
        beforeEach(() => {
            messages = [];
            mockFn = (...msg) => messages.push([...msg]);
            ChatSessionObject.setGlobalConfig({
                features: { messageReceipts: { shouldSendMessageReceipts: false }},
                loggerConfig: {
                    useDefaultLogger: true
                }
            });
        });
        function setConfig(level, useDefaultLogger = true) {
            ChatSessionObject.setGlobalConfig({
                loggerConfig: {
                    useDefaultLogger,
                    level: level,
                    advancedLogWriter: "info"
                }
            });
        }
        it("should not log if clientLogger is not initialized", () => {
            console.debug = mockFn;
            setConfig(LogLevel.DEBUG, false);
            var logMessage = LogManager.writeToClientLogger(LogLevel.DEBUG, "test", "metadata");
            expect(logMessage).toEqual(undefined);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.debug("debug", 3);
            expect(messages[0]).toEqual(undefined);
        });
        it("should match log format in debug level", () => {
            console.debug = mockFn;
            setConfig(LogLevel.DEBUG);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.debug("debug", undefined);
            expect(messages[0]).toEqual(["DEBUG [2022-04-12T23:12:36.677Z] prefix : debug  "]);
            logger.debug("debug", 3);
            expect(messages[1]).toEqual(["DEBUG [2022-04-12T23:12:36.677Z] prefix : debug 3 "]);
        });
        it("should match log format in info level", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.info("info", 3);
            expect(messages[0]).toEqual(["INFO [2022-04-12T23:12:36.677Z] prefix : info 3 "]);
        });
        it("should match log format in warn level", () => {
            console.warn = mockFn;
            setConfig(LogLevel.WARN);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.warn("warn", 3);
            expect(messages[0]).toEqual([defaultMessageReceiptsError]);
            expect(messages[1]).toEqual(["WARN [2022-04-12T23:12:36.677Z] prefix : warn 3 "]);
        });
        it("should match log format in error level", () => {
            console.error = mockFn;
            setConfig(LogLevel.ERROR);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.error("error", 3);
            expect(messages[1]).toEqual(["ERROR [2022-04-12T23:12:36.677Z] prefix : error 3 "]);
        });
        it("should match log format in advanced_log level", () => {
            console.error = mockFn;
            setConfig(LogLevel.ADVANCED_LOG);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.advancedLog("info", 3);
            expect(messages[1]).toEqual(["ADVANCED_LOG [2022-04-12T23:12:36.677Z] prefix : info 3 "]);
        });
        test("set region", () => {
            ChatSessionObject.setGlobalConfig({
                region: "ap-northeast-1"
            });
            expect(GlobalConfig.getRegion()).toEqual("ap-northeast-1");
        });
        it("should match log format when logMetaData object is included", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ prefix: "prefix ", logMetaData });
            logger.info("info", 3);
            expect(messages[2]).toEqual(["INFO [2022-04-12T23:12:36.677Z] prefix : info 3 {\"contactId\":\"abc\"}"]);
        });
        it("should match log format when there is no prefix and logMetaData", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ logMetaData: {contactId: "abc"}});
            logger.info("info", 3);
            expect(messages[2]).toEqual(["INFO [2022-04-12T23:12:36.677Z] info 3 {\"contactId\":\"abc\"}"]);
        });
        it("should match log format when there is no prefix, but logMetaData is included", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ logMetaData });
            logger.info("info", 3);
            expect(messages[2]).toEqual(["INFO [2022-04-12T23:12:36.677Z] info 3 {\"contactId\":\"abc\"}"]);
        });
    });
  
    describe("About using customized logger", () => {
        beforeEach(() => {
            testLogger = {};
            testLogger.debug = jest.fn();
            testLogger.info = jest.fn();
            testLogger.warn = jest.fn();
            testLogger.error = jest.fn();
        });
        it("should match log format when use customized logger", () => {
            ChatSessionObject.setGlobalConfig({
                features: { messageReceipts: { shouldSendMessageReceipts: false }},
                loggerConfig: {
                    customizedLogger: testLogger,
                    level: LogLevel.WARN
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix " });
    
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.warn.mock.calls[1][0]).toEqual("WARN [\"warn\",3] ");
            expect(testLogger.error.mock.calls[0][0]).toEqual("ERROR [\"error\",4] ");
            expect(testLogger.error.mock.calls[1][0]).toEqual("ERROR [\"error\",5] ");
        });
        it("should match log format when use custom logger", () => {
            ChatSessionObject.setGlobalConfig({
                features: { messageReceipts: { shouldSendMessageReceipts: false }},
                loggerConfig: {
                    logger: testLogger,
                    level: LogLevel.WARN
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix " });
    
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.warn.mock.calls[1][0]).toEqual("WARN [\"warn\",3] ");
            expect(testLogger.error.mock.calls[0][0]).toEqual("ERROR [\"error\",4] ");
            expect(testLogger.error.mock.calls[1][0]).toEqual("ERROR [\"error\",5] ");
        });
  
        test("default log level should be INFO", () => {
            ChatSessionObject.setGlobalConfig({
                // "level" property is not set, so it is using default log level(INFO). The DEBUG level in this test will not trigger.
                loggerConfig: {
                    customizedLogger: testLogger,
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix" });
            logger.debug("debug", 1);
            logger.info("info", 2);
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.debug.mock.calls.length).toEqual(0);
            expect(testLogger.info.mock.calls.length).toEqual(1);
            expect(testLogger.warn.mock.calls.length).toEqual(2);
            expect(testLogger.error.mock.calls.length).toEqual(2);
        });
    
        it("should override log level to ERROR", () => {
            ChatSessionObject.setGlobalConfig({
                loggerConfig: {
                    customizedLogger: testLogger,
                    // Log level is overwritten to ERROR, so all other log levels will not trigger.
                    level: LogLevel.ERROR
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix" });
            logger.debug("debug", 1);
            logger.info("info", 2);
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.debug.mock.calls.length).toEqual(0);
            expect(testLogger.info.mock.calls.length).toEqual(0);
            expect(testLogger.warn.mock.calls.length).toEqual(0);
            expect(testLogger.error.mock.calls.length).toEqual(2);
        });
  
        it("should call logger with correct params [logLevel, logStatement, logMetaData]", () => {
            ChatSessionObject.setGlobalConfig({
                loggerConfig: {
                    customizedLogger: testLogger,
                    level: LogLevel.ADVANCED_LOG,
                    advancedLogWriter: 'info'
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix" });
            const arg3 = {"arg": "arg3"};
            logger.advancedLog("arg1", "arg2", arg3);
            expect(testLogger.info.mock.calls[0][0]).toEqual("ADVANCED_LOG [\"arg1\",\"arg2\",{\"arg\":\"arg3\"}] ");
        });
        it("multiple import of loggers should get their own instance for logMetaData object", () => {
            ChatSessionObject.setGlobalConfig({
                loggerConfig: {
                    customizedLogger: testLogger,
                    level: LogLevel.ADVANCED_LOG,
                    advancedLogWriter: 'info'
                }
            });
            var logger1 = LogManager.getLogger({ prefix: "prefix", logMetaData: "metadata1" });
            var logger2 = LogManager.getLogger({ prefix: "prefix", logMetaData: "metadata2" });
            const arg3 = {"arg": "arg3"};
            logger1.advancedLog("arg1", "arg2", arg3);
            logger2.advancedLog("arg1", "arg2", arg3);
            expect(testLogger.info.mock.calls[0][0]).toEqual("ADVANCED_LOG [\"arg1\",\"arg2\",{\"arg\":\"arg3\"}] metadata1");
            expect(testLogger.info.mock.calls[1][0]).toEqual("ADVANCED_LOG [\"arg1\",\"arg2\",{\"arg\":\"arg3\"}] metadata2");
        });
    });

    describe("feature flag test", () => {
        it("Should have message receipts feature enabled by default", () => {
            GlobalConfig.update({
                features: [FEATURES.MESSAGE_RECEIPTS_ENABLED]
            });
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(true);
        });

        it("Should update feature flags according to setGlobalConfig input", () => {
            ChatSessionObject.setGlobalConfig({
                features: {
                    messageReceipts: {
                        shouldSendMessageReceipts: false,
                        throttleTime: 4000,
                    }
                }
            });
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(false);
            expect(GlobalConfig.getMessageReceiptsThrottleTime()).toEqual(4000);
        });

        it("Should be able to remove feature flag", () => {
            GlobalConfig.removeFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(false);
        });

        it("Should be able to add feature flag", () => {
            GlobalConfig.setFeatureFlag(FEATURES.PARTICIPANT_CONN_ACK);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.PARTICIPANT_CONN_ACK)).toEqual(true);
        });

        it("Should update feature flag and call the registered listeners only once", () => {
            GlobalConfig.removeFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            const handler = jest.fn();
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(false);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalled();
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should update feature flag and call multiple registered listeners only once", () => {
            const handler = jest.fn().mockReturnValue(true);
            const handler2 = jest.fn();
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(true);
            GlobalConfig.removeFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(false);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler2)).toEqual(false);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            GlobalConfig.setFeatureFlag(FEATURES.PARTICIPANT_CONN_ACK);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(true);
            expect(handler).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
            GlobalConfig.removeFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            GlobalConfig.removeFeatureFlag(FEATURES.PARTICIPANT_CONN_ACK);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalledTimes(3);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe("About using custom webSocketManagerConfig", () => {
        it('should pass not down invalid config object', () => {
            expect(() => ChatSessionObject.setGlobalConfig(null)).toThrow(TypeError);
        });
 
        it('should pass down config to WebSocketManager', () => {
            const mockConfig = {
                loggerConfig: {},
                webSocketManagerConfig: {
                    isNetworkOnline: () => true
                }
            };
 
            jest.spyOn(WebSocketManager, 'setGlobalConfig').mockImplementation(() => {});
 
            ChatSessionObject.setGlobalConfig(mockConfig);
            expect(WebSocketManager.setGlobalConfig).toHaveBeenCalledWith(mockConfig);
        });
    });
});
