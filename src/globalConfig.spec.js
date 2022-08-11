import { ChatSessionObject } from "./core/chatSession";
import { LogLevel, LogManager } from "./log";
import { GlobalConfig } from "./globalConfig";

const realDate = Date.now;
const fixDate = "2022-04-12T23:12:36.677Z";

var testLogger;

const originDebug = console.debug;
const originInfo = console.info;
const originWarn = console.warn;
const originError = console.error;

beforeAll(() => {
  global.Date.now = jest.fn(() => new Date(fixDate).getTime())
})

afterAll(() => {
  global.Date.now = realDate;
  console.info = originInfo;
  console.debug = originDebug;
  console.warn = originWarn;
  console.error = originError;

})

describe("About using default logger", () => {
  let messages;
  let mockFn;
  beforeEach(() => {
    messages = [];
    mockFn = (msg) => messages.push(msg);
    ChatSessionObject.setGlobalConfig({
      loggerConfig: {
        useDefaultLogger: true
      }
    });
  })
  function setConfig(level, advancedLogWriter) {
    ChatSessionObject.setGlobalConfig({
      loggerConfig: {
        useDefaultLogger: true,
        level: level,
        advancedLogWriter: advancedLogWriter
      }
    });
  }
  it("should match log format in debug level", () => {
    console.debug = mockFn;
    setConfig(LogLevel.DEBUG)
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.debug("debug", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][DEBUG] prefix : debug 3");
  })
  it("should match log format in advanced_log level", () => {
    console.info = mockFn;
    setConfig(LogLevel.ADVANCED_LOG, "info");
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.advancedLog("info", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][ADVANCED_LOG] prefix : info 3");
  });
  it("should log error for incorrect config for advanced_log", () => {
    console.error = mockFn;
    setConfig(LogLevel.ADVANCED_LOG, "Info");
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.advancedLog("info", 3);
    expect(messages[0]).toBe("incorrect value for loggerConfig:advancedLogWriter; use valid values from list warn,info,debug,log but used Info");
  });
  it("should match log format in info level", () => {
    console.info = mockFn;
    setConfig(LogLevel.INFO);
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.info("info", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][INFO] prefix : info 3");
  })
  it("should match log format in warn level", () => {
    console.warn = mockFn;
    setConfig(LogLevel.WARN);
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.warn("warn", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][WARN] prefix : warn 3");
  })
  it("should match log format in error level", () => {
    console.error = mockFn;
    setConfig(LogLevel.ERROR);
    var logger = LogManager.getLogger({ prefix: "prefix " });
    logger.error("error", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][ERROR] prefix : error 3");
  })
  test("set region", () => {
    ChatSessionObject.setGlobalConfig({
      region: "ap-northeast-1"
    });
    expect(GlobalConfig.getRegion()).toEqual("ap-northeast-1");
  });
  it("should match log format when logMetaData object is included", () => {
    console.info = mockFn;
    setConfig(LogLevel.INFO)
    const logMetaData = {contactId: "abc"};
    var logger = LogManager.getLogger({ prefix: "prefix ", logMetaData });
    logger.info("info", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][INFO] prefix : Meta data: {\"contactId\":\"abc\"} info 3");
  })
  it("should match log format when there is no prefix and logMetaData", () => {
    console.info = mockFn;
    setConfig(LogLevel.INFO)
    var logger = LogManager.getLogger();
    logger.info("info", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][INFO] info 3");
  })
  it("should match log format when there is no prefix, but logMetaData is included", () => {
    console.info = mockFn;
    setConfig(LogLevel.INFO)
    const logMetaData = {contactId: "abc"};
    var logger = LogManager.getLogger({ logMetaData });
    logger.info("info", 3);
    expect(messages[0]).toBe("[2022-04-12T23:12:36.677Z][INFO] Meta data: {\"contactId\":\"abc\"} info 3");
  })
})

describe("About using customized logger", () => {
  beforeEach(() => {
    testLogger = {};
    testLogger.debug = jest.fn();
    testLogger.info = jest.fn();
    testLogger.warn = jest.fn();
    testLogger.error = jest.fn();
  })
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
  
    expect(testLogger.warn.mock.calls[0][0]).toEqual(["warn", 3]);
    expect(testLogger.error.mock.calls[0][0]).toEqual(["error", 4]);
    expect(testLogger.error.mock.calls[1][0]).toEqual(["error", 5]);
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
  
    expect(testLogger.debug.mock.calls.length).toBe(0);
    expect(testLogger.info.mock.calls.length).toBe(1);
    expect(testLogger.warn.mock.calls.length).toBe(1);
    expect(testLogger.error.mock.calls.length).toBe(2);
  })
  
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
  
    expect(testLogger.debug.mock.calls.length).toBe(0);
    expect(testLogger.info.mock.calls.length).toBe(0);
    expect(testLogger.warn.mock.calls.length).toBe(0);
    expect(testLogger.error.mock.calls.length).toBe(2);
  });
});
