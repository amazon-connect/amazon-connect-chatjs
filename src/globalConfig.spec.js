import { ChatSessionObject } from "./core/chatSession";
import { LogLevel, LogManager } from "./log";
import { GlobalConfig } from "./globalConfig";

test("check logger", () => {
  var testLogger = {};
  testLogger.debug = jest.fn();
  testLogger.info = jest.fn();
  testLogger.warn = jest.fn();
  testLogger.error = jest.fn();

  ChatSessionObject.setGlobalConfig({
    loggerConfig: {
      logger: testLogger,
      level: LogLevel.WARN
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
  expect(testLogger.warn.mock.calls.length).toBe(1);
  expect(testLogger.error.mock.calls.length).toBe(2);

  expect(testLogger.warn.mock.calls[0][0]).toBe("prefix warn 3 ");
  expect(testLogger.error.mock.calls[0][0]).toBe("prefix error 4 ");
  expect(testLogger.error.mock.calls[1][0]).toBe("prefix error 5 ");
});

test("set region", () => {
  ChatSessionObject.setGlobalConfig({
    region: "ap-northeast-1"
  });
  expect(GlobalConfig.getRegion()).toEqual("ap-northeast-1");
});
