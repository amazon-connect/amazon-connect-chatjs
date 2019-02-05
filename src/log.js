import Utils from "./utils";
import { LOGS_DESTINATION } from "./constants";

/*eslint-disable no-unused-vars*/
class Logger {
  debug(data) {}

  info(data) {}

  warn(data) {}

  error(data) {}
}
/*eslint-enable no-unused-vars*/

const LogLevel = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40
};

class LogManagerImpl {
  constructor() {
    this.updateLoggerConfig();
    this.consoleLoggerWrapper = createConsoleLogger();
  }

  writeToClientLogger(level, logStatement) {
    if (!this.hasClientLogger()) {
      return;
    }
    switch (level) {
      case LogLevel.DEBUG:
        return this._clientLogger.debug(logStatement);
      case LogLevel.INFO:
        return this._clientLogger.info(logStatement);
      case LogLevel.WARN:
        return this._clientLogger.warn(logStatement);
      case LogLevel.ERROR:
        return this._clientLogger.error(logStatement);
    }
  }

  isLevelEnabled(level) {
    return level >= this._level;
  }

  hasClientLogger() {
    return this._clientLogger !== null;
  }

  getLogger(options) {
    var prefix = options.prefix || "";
    if (this._logsDestination === LOGS_DESTINATION.DEBUG) {
      return this.consoleLoggerWrapper;
    }
    return new LoggerWrapperImpl(prefix);
  }

  updateLoggerConfig(inputConfig) {
    var config = inputConfig || {};
    this._level = config.level || LogLevel.INFO;
    this._clientLogger = config.logger || null;
    this._logsDestination = LOGS_DESTINATION.NULL;
    if (config.debug) {
      this._logsDestination = LOGS_DESTINATION.DEBUG;
    }
    if (config.logger) {
      this._logsDestination = LOGS_DESTINATION.CLIENT_LOGGER;
    }
  }
}

class LoggerWrapper {
  debug() {}

  info() {}

  warn() {}

  error() {}
}

class LoggerWrapperImpl extends LoggerWrapper {
  constructor(prefix) {
    super();
    this.prefix = prefix || "";
  }

  debug(...args) {
    this._log(LogLevel.DEBUG, args);
  }

  info(...args) {
    this._log(LogLevel.INFO, args);
  }

  warn(...args) {
    this._log(LogLevel.WARN, args);
  }

  error(...args) {
    this._log(LogLevel.ERROR, args);
  }

  _shouldLog(level) {
    return LogManager.hasClientLogger() && LogManager.isLevelEnabled(level);
  }

  _writeToClientLogger(level, logStatement) {
    LogManager.writeToClientLogger(level, logStatement);
  }

  _log(level, args) {
    if (this._shouldLog(level)) {
      var logStatement = this._convertToSingleStatement(args);
      this._writeToClientLogger(level, logStatement);
    }
  }

  _convertToSingleStatement(args) {
    var logStatement = "";
    if (this.prefix) {
      logStatement += this.prefix + " ";
    }
    for (var index = 0; index < args.length; index++) {
      var arg = args[index];
      logStatement += this._convertToString(arg) + " ";
    }
    return logStatement;
  }

  _convertToString(arg) {
    try {
      if (!arg) {
        return "";
      }
      if (Utils.isString(arg)) {
        return arg;
      }
      if (Utils.isObject(arg) && Utils.isFunction(arg.toString)) {
        var toStringResult = arg.toString();
        if (toStringResult !== "[object Object]") {
          return toStringResult;
        }
      }
      return JSON.stringify(arg);
    } catch (error) {
      console.error("Error while converting argument to string", arg, error);
      return "";
    }
  }
}

var createConsoleLogger = () => {
  var logger = new LoggerWrapper();
  logger.debug = console.debug.bind(window.console);
  logger.info = console.info.bind(window.console);
  logger.warn = console.warn.bind(window.console);
  logger.error = console.error.bind(window.console);
  return logger;
};

const LogManager = new LogManagerImpl();

export { LogManager, Logger, LogLevel };
