class GlobalConfigImpl {
    constructor() {
        this.stage = "prod";
        this.region = "us-west-2";
        this.reconnect = true;
    }
    update(configInput) {
        var config = configInput || {};
        this.stage = config.stage || this.stage;
        this.region = config.region || this.region;
        this.endpointOverride = config.endpoint || this.endpointOverride;
        this.reconnect = config.reconnect === false ? false : this.reconnect;
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
 
    getStage() {
        return this.stage;
    }
}

const GlobalConfig = new GlobalConfigImpl();

export { GlobalConfig };
