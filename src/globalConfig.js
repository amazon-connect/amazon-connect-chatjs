class GlobalConfigImpl {
  update(configInput) {
    var config = configInput || {};
    this.region = config.region || this.region;
    this.endpointOverride = config.endpoint || this.endpointOverride;
    this.reconnect = config.reconnect || false;
    this.reconnectInterval = config.reconnectInterval || 1000;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 30;
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
