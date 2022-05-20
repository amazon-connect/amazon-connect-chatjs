import Utils from "./utils";

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
    // option: {prefix: string; logMetaData: object}
    return new LoggerWrapperImpl(options);
  }

  updateLoggerConfig(inputConfig) {
    var config = inputConfig || {};
    this._level = config.level || LogLevel.INFO;
    if(config.customizedLogger && typeof config.customizedLogger === "object") {
      this.useClientLogger = true;
    }

    this._clientLogger = this.selectLogger(config);
  }

  selectLogger(config) {
    if(config.customizedLogger && typeof config.customizedLogger === "object") {
      return config.customizedLogger;
    }
    if(config.useDefaultLogger) {
      return createConsoleLogger();
    }
    return null;
  }
}

class LoggerWrapper {
  debug() {}

  info() {}

  warn() {}

  error() {}
}

class LoggerWrapperImpl extends LoggerWrapper {
  constructor(options) {
    super();
    this.options = options || "";
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
      var logStatement = LogManager.useClientLogger ? args : this._convertToSingleStatement(level, args);
      this._writeToClientLogger(level, logStatement);
    }
  }

  _convertToSingleStatement(logLevel, args) {
    var date = new Date(Date.now()).toISOString();
    var level = this._getLogLevelByValue(logLevel);
    var logStatement = `[${date}][${level}]`;
    if (this.options) {
      this.options.prefix ? logStatement += " " + this.options.prefix + ":" : logStatement += "";
      this.options.logMetaData ? logStatement += " Meta data: " + JSON.stringify(this.options.logMetaData) : logStatement += "";
    }
    for (var index = 0; index < args.length; index++) {
      var arg = args[index];
      logStatement += " " + this._convertToString(arg);
    }
    return logStatement;
  }

  _getLogLevelByValue(value) {
    switch(value) {
      case 10: return "DEBUG";
      case 20: return "INFO";
      case 30: return "WARN";
      case 40: return "ERROR";
    }
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
