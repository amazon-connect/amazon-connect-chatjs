import { FEATURES, DEFAULT_MESSAGE_RECEIPTS_THROTTLE_MS } from "./constants";

class GlobalConfigImpl {
    constructor() {
        this.stage = "prod";
        this.region = "us-west-2";
        this.reconnect = true;
        let self = this;
        this.features = new Proxy([], {
            set: function(target, property, value) {
                console.log("new features added, initialValue: "
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
        this.addFeatureFlag(FEATURES.MESSAGE_RECEIPTS_ENABLED); // message receipts enabled by default
        this.messageReceiptThrottleTime = DEFAULT_MESSAGE_RECEIPTS_THROTTLE_MS;
        this.featureChangeListeners = [];
    }
    update(configInput) {
        var config = configInput || {};
        this.stage = config.stage || this.stage;
        this.region = config.region || this.region;
        this.endpointOverride = config.endpoint || this.endpointOverride;
        this.reconnect = config.reconnect === false ? false : this.reconnect;
    }

    updateStageRegion(config) {
        if (config) {
            this.stage = config.stage || this.stage;
            this.region = config.region || this.region;
        }
    }

    updateMessageReceiptsThrottleTime(throttleTime) {
        this.messageReceiptThrottleTime = throttleTime || this.messageReceiptThrottleTime;
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

    removeFeatureFlag(feature) {
        if (!this.isFeatureEnabled(feature)) {
            return;
        }
        const index = this.features["values"].indexOf(feature);
        this.features["values"].splice(index, 1);
    }

    addFeatureFlag(feature) {
        if (this.isFeatureEnabled(feature)) {
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
        if (Array.isArray(this.features["values"]) &&
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
