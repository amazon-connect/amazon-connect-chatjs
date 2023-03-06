import { ChatSessionObject } from "./core/chatSession";
import { LogLevel, LogManager } from "./log";
import { GlobalConfig } from "./globalConfig";
import { FEATURES } from "./constants";

const realDate = Date.now;
const fixDate = "2022-04-12T23:12:36.677Z";

var testLogger;

const originDebug = console.debug;
const originInfo = console.info;
const originWarn = console.warn;
const originError = console.error;

const stageRegion = {
    stage: "test-stage",
    region: "test-region",
};

const configInput = {
    ...stageRegion,
    endpoint: "test-endpoint"
};
const logMetaData = {contactId: "abc"};
const defaultMessageReceiptsError = "enabling message-receipts by default; to disable set config.features.messageReceipts.shouldSendMessageReceipts = false";

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
            expect(GlobalConfig.region).toEqual("us-west-2");
            expect(GlobalConfig.stage).toEqual("prod");
            expect(GlobalConfig.reconnect).toBe(true);
        });
        it("should update all and fetch correct config", () => {
            GlobalConfig.update(configInput);
            expect(GlobalConfig.getStage()).toEqual(configInput.stage);
            expect(GlobalConfig.getRegion()).toEqual(configInput.region);
            expect(GlobalConfig.getEndpointOverride()).toEqual(configInput.endpoint);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(false);
        });
        it("should update stage, region and fetch correct config", () => {
            GlobalConfig.updateStageRegion(stageRegion);
            expect(GlobalConfig.getStage()).toEqual(stageRegion.stage);
            expect(GlobalConfig.getRegion()).toEqual(stageRegion.region);
        });
    });
  
    describe("About using default logger", () => {
        let messages;
        let mockFn;
        beforeEach(() => {
            messages = [];
            mockFn = (...msg) => messages.push([...msg]);
            ChatSessionObject.setGlobalConfig({
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
            expect(messages[0]).toEqual(["DEBUG", "[2022-04-12T23:12:36.677Z] prefix : debug ", undefined]);
            logger.debug("debug", 3);
            expect(messages[1]).toEqual(["DEBUG", "[2022-04-12T23:12:36.677Z] prefix : debug 3", undefined]);
        });
        it("should match log format in info level", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.info("info", 3);
            expect(messages[0]).toEqual(["INFO", "[2022-04-12T23:12:36.677Z] prefix : info 3", undefined]);
        });
        it("should match log format in warn level", () => {
            console.warn = mockFn;
            setConfig(LogLevel.WARN);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.warn("warn", 3);
            expect(messages[0]).toEqual([defaultMessageReceiptsError]);
            expect(messages[1]).toEqual(["WARN", "[2022-04-12T23:12:36.677Z] prefix : warn 3", undefined]);
        });
        it("should match log format in error level", () => {
            console.error = mockFn;
            setConfig(LogLevel.ERROR);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.error("error", 3);
            expect(messages[2]).toEqual(["ERROR", "[2022-04-12T23:12:36.677Z] prefix : error 3", undefined]);
        });
        it("should match log format in advanced_log level", () => {
            console.error = mockFn;
            setConfig(LogLevel.ADVANCED_LOG);
            var logger = LogManager.getLogger({ prefix: "prefix " });
            logger.advancedLog("info", 3);
            expect(messages[2]).toEqual(["ADVANCED_LOG", "[2022-04-12T23:12:36.677Z] prefix : info 3", undefined]);
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
            expect(messages[2]).toEqual(["INFO","[2022-04-12T23:12:36.677Z] prefix : info 3", logMetaData]);
        });
        it("should match log format when there is no prefix and logMetaData", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ logMetaData: {contactId: "abc"}});
            logger.info("info", 3);
            expect(messages[2]).toEqual(["INFO", "[2022-04-12T23:12:36.677Z] info 3", {contactId: "abc"}]);
        });
        it("should match log format when there is no prefix, but logMetaData is included", () => {
            console.info = mockFn;
            setConfig(LogLevel.INFO);
            var logger = LogManager.getLogger({ logMetaData });
            logger.info("info", 3);
            expect(messages[2]).toEqual(["INFO", "[2022-04-12T23:12:36.677Z] info 3", logMetaData]);
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
                loggerConfig: {
                    customizedLogger: testLogger,
                    level: LogLevel.WARN
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix " });
    
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.warn.mock.calls[0][0]).toEqual("WARN");
            expect(testLogger.warn.mock.calls[0][1]).toEqual(["warn", 3]);
            expect(testLogger.error.mock.calls[0][0]).toEqual("ERROR");
            expect(testLogger.error.mock.calls[0][1]).toEqual(["error", 4]);
            expect(testLogger.error.mock.calls[1][0]).toEqual("ERROR");
            expect(testLogger.error.mock.calls[1][1]).toEqual(["error", 5]);
        });
        it("should match log format when use custom logger", () => {
            ChatSessionObject.setGlobalConfig({
                loggerConfig: {
                    logger: testLogger,
                    level: LogLevel.WARN
                }
            });
            var logger = LogManager.getLogger({ prefix: "prefix " });
    
            logger.warn("warn", 3);
            logger.error("error", 4);
            logger.error("error", 5);
    
            expect(testLogger.warn.mock.calls[0][0]).toEqual("WARN");
            expect(testLogger.warn.mock.calls[0][1]).toEqual(["warn", 3]);
            expect(testLogger.error.mock.calls[0][0]).toEqual("ERROR");
            expect(testLogger.error.mock.calls[0][1]).toEqual(["error", 4]);
            expect(testLogger.error.mock.calls[1][0]).toEqual("ERROR");
            expect(testLogger.error.mock.calls[1][1]).toEqual(["error", 5]);
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
            expect(testLogger.warn.mock.calls.length).toEqual(1);
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
            expect(testLogger.info.mock.calls[0][0]).toEqual("ADVANCED_LOG");
            expect(testLogger.info.mock.calls[0][1]).toEqual(["arg1", "arg2", arg3]);
            expect(testLogger.info.mock.calls[0][2]).toEqual(undefined);
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
            expect(testLogger.info.mock.calls[0][0]).toEqual("ADVANCED_LOG");
            expect(testLogger.info.mock.calls[0][1]).toEqual(["arg1", "arg2", arg3]);
            expect(testLogger.info.mock.calls[0][2]).toEqual("metadata1");
            expect(testLogger.info.mock.calls[1][0]).toEqual("ADVANCED_LOG");
            expect(testLogger.info.mock.calls[1][1]).toEqual(["arg1", "arg2", arg3]);
            expect(testLogger.info.mock.calls[1][2]).toEqual("metadata2");
        });
    });

    describe("feature flag test", () => {
        it("should update feature Flag", () => {
            GlobalConfig.update({
                features: [FEATURES.MESSAGE_RECEIPTS_ENABLED]
            });
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED)).toEqual(true);
        });
        it("should update feature Flag and call the registered listeners only once", () => {
            GlobalConfig.update({
                features: []
            });
            const handler = jest.fn();
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(false);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalled();
            GlobalConfig.update({
                features: {
                    messageReceipts: {
                        shouldSendMessageReceipts: false
                    }
                }
            });
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should update feature Flag and call multiple registered listeners only once", () => {
            GlobalConfig.update({
                features: {
                    messageReceipts: {
                        shouldSendMessageReceipts: true
                    }
                }
            });
            const handler = jest.fn().mockReturnValue(true);
            const handler2 = jest.fn();
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(false);
            GlobalConfig.update({
                features: []
            });
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(false);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler2)).toEqual(false);
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(GlobalConfig.isFeatureEnabled(FEATURES.MESSAGE_RECEIPTS_ENABLED, handler)).toEqual(true);
            expect(handler).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
            GlobalConfig.update({
                features: []
            });
            GlobalConfig.setFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED);
            expect(handler).toHaveBeenCalledTimes(3);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });
});
