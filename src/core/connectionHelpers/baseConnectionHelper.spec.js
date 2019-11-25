import BaseConnectionHelper from "./baseConnectionHelper";

describe("BaseConnectionHelper", () => {

  let baseConnectionHelper;
  const connectionDetailsProvider = {
    fetchConnectionToken: () => {},
    getConnectionTokenExpiry: () => {}
  };

  beforeEach(() => {
    connectionDetailsProvider.fetchConnectionToken = jest.fn();
    connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => 100000);
    baseConnectionHelper = new BaseConnectionHelper(connectionDetailsProvider);
    jest.useFakeTimers();
    jest.clearAllTimers()
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("start initiates fetch interval", () => {
    baseConnectionHelper.start();
    jest.runOnlyPendingTimers();
    expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();
    expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(2);
  });

  test("end stops fetch interval", () => {
    baseConnectionHelper.start();
    jest.runOnlyPendingTimers();
    baseConnectionHelper.end();
    jest.runOnlyPendingTimers();
    expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(1);
  });
});
