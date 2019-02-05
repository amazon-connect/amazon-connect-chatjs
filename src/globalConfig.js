class GlobalConfigImpl {
  update(configInput) {
    var config = configInput || {};
    this.region = config.region;
  }

  getRegion() {
    return this.region;
  }
}

const GlobalConfig = new GlobalConfigImpl();

export { GlobalConfig };
