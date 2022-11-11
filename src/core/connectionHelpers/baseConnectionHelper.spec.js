import BaseConnectionHelper from "./baseConnectionHelper";

describe("BaseConnectionHelper", () => {

    let baseConnectionHelper;
    const connectionDetailsProvider = {
        fetchConnectionToken: () => {},
        getConnectionTokenExpiry: () => {}
    };

    beforeEach(() => {
        connectionDetailsProvider.fetchConnectionToken = jest.fn(() => Promise.resolve());
        // .getConnectionTokenExpiry usually returns the date, in ms since 1969, when this connection token expires)
        connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => { return new Date(new Date().getTime() + 22*60*60*1000);});
        baseConnectionHelper = new BaseConnectionHelper(connectionDetailsProvider);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    test("start initiates fetch interval", () => {
        baseConnectionHelper.start();
        expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(0);
        jest.runOnlyPendingTimers();
        expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(1);
    });

    test("end stops fetch interval", () => {
        baseConnectionHelper.start();
        jest.runOnlyPendingTimers();
        baseConnectionHelper.end();
        jest.runOnlyPendingTimers();
        expect(connectionDetailsProvider.fetchConnectionToken).toHaveBeenCalledTimes(1);
    });

    test("getTimeToConnectionTokenExpiry returns the expiry, not the date", () => {
    // expect that the expiry returned is a length in ms between now and the expiry date, not a date itself (in ms). 
    // A date (in ms) would be larger than this constant.
        expect(baseConnectionHelper.getTimeToConnectionTokenExpiry()).toBeLessThan(100000000);
    });
});
