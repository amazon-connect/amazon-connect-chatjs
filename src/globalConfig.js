class GlobalConfigImpl {
    constructor() {
        this.stage = "prod";
        this.region = "us-west-2";
        this.reconnect = true;
        let self = this;
        this.features = new Proxy([], {
            set: function(target, property, value) {
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
        this.endpointOverride = config.endpoint || this.endpointOverride;
        this.reconnect = config.reconnect === false ? false : this.reconnect;
        this.messageReceiptThrottleTime = config.throttleTime ? config.throttleTime : 5000;
        this.features["values"] = config.features ? [...config.features] : new Array();
    }

    getRegion() {
        return this.region;
    }

    getEndpointOverride() {
        return this.endpointOverride;
    }

    updateStageRegion(config) {
        if (config) {
            this.stage = config.stage || this.stage;
            this.region = config.region || this.region;
        }
    }

    updateThrottleTime(throttleTime) {
        this.messageReceiptThrottleTime = throttleTime ? throttleTime : this.messageReceiptThrottleTime;
    }

    getMessageReceiptsThrottleTime() {
        return this.messageReceiptThrottleTime;
    }

    setFeatureFlag(feature) {
        if(this.isFeatureEnabled(feature)) {
            return;
        }
        const featureValues = this.features["values"];
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
 
    getStage() {
        return this.stage;
    }
}

const GlobalConfig = new GlobalConfigImpl();

export { GlobalConfig };
