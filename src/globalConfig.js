class GlobalConfigImpl {
  update(configInput) {
    var config = configInput || {};
    this.region = config.region || this.region;
    this.endpointOverride = config.endpoint || this.endpointOverride;
    this.reconnect = config.reconnect === false ? false : true;
  }

  getRegion() {
    return this.region;
  }

  getEndpointOverride() {
    return this.endpointOverride;
  }
}

const GlobalConfig = new GlobalConfigImpl();

export { GlobalConfig };
