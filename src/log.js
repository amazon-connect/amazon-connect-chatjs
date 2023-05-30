import Utils from "./utils";

/*eslint-disable no-unused-vars*/
class Logger {
    debug(data) {}

    info(data) {}

    warn(data) {}

    error(data) {}

    advancedLog(data) {}
}
/*eslint-enable no-unused-vars*/

const LogLevel = {
    DEBUG: 10,
    INFO: 20,
    WARN: 30,
    ERROR: 40,
    ADVANCED_LOG: 50,
};

class LogManagerImpl {
    constructor() {
        this.updateLoggerConfig();
    }

    writeToClientLogger(level, logStatement = '', logMetaData = '') {
        if (!this.hasClientLogger()) {
            return;
        }
        const log1 = typeof logStatement === "string" ? logStatement : JSON.stringify(logStatement, removeCircularReference());
        const log2 = typeof logMetaData === "string" ? logMetaData : JSON.stringify(logMetaData, removeCircularReference());
        const logStringValue = `${getLogLevelByValue(level)} ${log1} ${log2}`;
        switch (level) {
        case LogLevel.DEBUG:
            return this._clientLogger.debug(logStringValue) || logStringValue;
        case LogLevel.INFO:
            return this._clientLogger.info(logStringValue) || logStringValue;
        case LogLevel.WARN:
            return this._clientLogger.warn(logStringValue) || logStringValue;
        case LogLevel.ERROR:
            return this._clientLogger.error(logStringValue) || logStringValue;
        case LogLevel.ADVANCED_LOG:
            return this._advancedLogWriter && this._clientLogger[this._advancedLogWriter](logStringValue) || logStringValue;
        }
    }

    isLevelEnabled(level) {
        return level >= this._level;
    }

    hasClientLogger() {
        return this._clientLogger !== null;
    }

    getLogger(options = {}) {
    // option: {prefix: string; logMetaData: object}
        return new LoggerWrapperImpl(options);
    }

    updateLoggerConfig(inputConfig) {
        var config = inputConfig || {};
        this._level = config.level || LogLevel.INFO;
        //enabled advancedLogWriter
        this._advancedLogWriter = "warn";
        if (isValidAdvancedLogConfig(config.advancedLogWriter, config.customizedLogger)) {
            this._advancedLogWriter = config.advancedLogWriter;
        }
        //enable clientLogger
        if((config.customizedLogger && typeof config.customizedLogger === "object") || 
            (config.logger && typeof config.logger === "object")) {
            this.useClientLogger = true;
        }
        this._clientLogger = this.selectLogger(config);
    }

    selectLogger(config) {
        if(config.customizedLogger && typeof config.customizedLogger === "object") {
            return config.customizedLogger;
        }
        if(config.logger && typeof config.logger === "object") {
            return config.logger;
        }
        if(config.useDefaultLogger) {
            return createConsoleLogger();
        }
        return null;
    }
}
const LogManager = new LogManagerImpl();

class LoggerWrapper {
    debug() {}

    info() {}

    warn() {}

    error() {}
}

class LoggerWrapperImpl extends LoggerWrapper {
    constructor(options) {
        super();
        this.options = options || {};
    }

    debug(...args) {
        return this._log(LogLevel.DEBUG, args);
    }

    info(...args) {
        return this._log(LogLevel.INFO, args);
    }

    warn(...args) {
        return this._log(LogLevel.WARN, args);
    }

    error(...args) {
        return this._log(LogLevel.ERROR, args);
    }

    advancedLog(...args) {
        return this._log(LogLevel.ADVANCED_LOG, args);
    }
 
    _shouldLog(level) {
        return LogManager.hasClientLogger() && LogManager.isLevelEnabled(level);
    }

    _writeToClientLogger(level, logStatement) {
        return LogManager.writeToClientLogger(level, logStatement, this.options?.logMetaData);
    }

    _log(level, args) {
        if (this._shouldLog(level)) {
            var logStatement = LogManager.useClientLogger ? args : this._convertToSingleStatement(args);
            return this._writeToClientLogger(level, logStatement);
        }
    }

    _convertToSingleStatement(args) {
        var date = new Date(Date.now()).toISOString();
        var logStatement = `[${date}]`;
        if (this.options) {
            this.options.prefix ? logStatement += " " + this.options.prefix + ":" : logStatement += "";
        }
        for (var index = 0; index < args.length; index++) {
            var arg = args[index];
            logStatement += " " + this._convertToString(arg);
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

function getLogLevelByValue(value) {
    switch(value) {
    case 10: return "DEBUG";
    case 20: return "INFO";
    case 30: return "WARN";
    case 40: return "ERROR";
    case 50: return "ADVANCED_LOG";
    }
}

function isValidAdvancedLogConfig(advancedLogVal, customizedLogger) {
    const customizedLoggerKeys = customizedLogger && Object.keys(customizedLogger);
    if (customizedLoggerKeys && customizedLoggerKeys.indexOf(advancedLogVal) === -1) {
        console.error(`customizedLogger: incorrect value for loggerConfig:advancedLogWriter; use valid values from list ${customizedLoggerKeys} but used ${advancedLogVal}`);
        return false;
    }
    const defaultLoggerKeys = ["warn", "info", "debug", "log"];
    if (advancedLogVal && defaultLoggerKeys.indexOf(advancedLogVal) === -1) {
        console.error(`incorrect value for loggerConfig:advancedLogWriter; use valid values from list ${defaultLoggerKeys} but used ${advancedLogVal}`);
        return false;
    }
    return true;
}

function removeCircularReference() {
    const seen = new WeakSet();

    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}

var createConsoleLogger = () => {
    var logger = new LoggerWrapper();
    logger.debug = console.debug.bind(window.console);
    logger.info = console.info.bind(window.console);
    logger.warn = console.warn.bind(window.console);
    logger.error = console.error.bind(window.console);
    return logger;
};


export { LogManager, Logger, LogLevel };
