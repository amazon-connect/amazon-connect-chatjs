import { LogManager } from "./log";

class GlobalConfigImpl {
    constructor() {
        this.stage = "prod";
        this.region = "us-west-2";
        this.cell = "1";
        this.reconnect = true;
        let self = this;
        this.logger = LogManager.getLogger({
            prefix: "ChatJS-GlobalConfig",
        });
        this.features = new Proxy([], {
            set: (target, property, value) => {
                this.stage !== "test-stage2" && this.logger.info("new features added, initialValue: "
                + target[property] + " , newValue: " + value, Array.isArray(target[property]));
                let oldVal = target[property];
                //fire change listeners
                if (Array.isArray(value)) {
                    value.forEach(feature => {
                        //if a new feature is added
                        if (Array.isArray(oldVal) && oldVal.indexOf(feature) === -1 && 
                                Array.isArray(self.featureChangeListeners[feature])) {
                                    
                            self.featureChangeListeners[feature].forEach(callback => callback());
                            self._cleanFeatureChangeListener(feature);
                        }
                    });
                }
                //change the value in this.features object.
                target[property] = value;
                return true;
            }
        });
        this.featureChangeListeners = [];
    }
    update(configInput) {
        var config = configInput || {};
        this.stage = config.stage || this.stage;
        this.region = config.region || this.region;
        this.cell = config.cell || this.cell;
        this.endpointOverride = config.endpoint || this.endpointOverride;
        this.reconnect = config.reconnect === false ? false : this.reconnect;
        this.messageReceiptThrottleTime = config.throttleTime ? config.throttleTime : 5000;
        this.features["values"] = Array.isArray(config.features) ? [...config.features] : new Array();
    }

    updateStageRegionCell(config) {
        if (config) {
            this.stage = config.stage || this.stage;
            this.region = config.region || this.region;
            this.cell = config.cell || this.cell;
        }
    }

    getCell() {
        return this.cell;
    }

    updateThrottleTime(throttleTime) {
        this.messageReceiptThrottleTime = throttleTime ? throttleTime : this.messageReceiptThrottleTime;
    }

    getMessageReceiptsThrottleTime() {
        return this.messageReceiptThrottleTime;
    }

    getStage() {
        return this.stage;
    }

    getRegion() {
        return this.region;
    }

    getEndpointOverride() {
        return this.endpointOverride;
    }

    setFeatureFlag(feature) {
        if(this.isFeatureEnabled(feature)) {
            return;
        }
        const featureValues = Array.isArray(this.features["values"]) ? this.features["values"] : [];
        this.features["values"] = [...featureValues, feature];
    }

    //private method
    _registerFeatureChangeListener(feature, callback) {
        if (!this.featureChangeListeners[feature]) {
            this.featureChangeListeners[feature] = [];
        }
        this.featureChangeListeners[feature].push(callback);
    }

    //private method
    _cleanFeatureChangeListener(feature) {
        delete this.featureChangeListeners[feature];
    }

    isFeatureEnabled(feature, callback) {
        if(Array.isArray(this.features["values"]) &&
            this.features["values"].indexOf(feature) !== -1) {
            if (typeof callback === "function") {
                return callback();
            }
            return true;
        }
        if (typeof callback === "function") {
            this._registerFeatureChangeListener(feature, callback);
        }
        return false;
    }
}

const GlobalConfig = new GlobalConfigImpl();

export { GlobalConfig };
