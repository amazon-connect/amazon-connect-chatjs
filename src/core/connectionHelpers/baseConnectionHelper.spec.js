import BaseConnectionHelper from "./baseConnectionHelper";

describe("BaseConnectionHelper", () => {

    let baseConnectionHelper;
    const connectionDetailsProvider = {
        fetchConnectionDetails: () => {},
        getConnectionTokenExpiry: () => {}
    };

    beforeEach(() => {
        connectionDetailsProvider.fetchConnectionDetails = jest.fn(() => Promise.resolve({
            url: "url",
            expiry: "expiry",
            transportLifeTimeInSeconds: new Date(new Date().getTime() + 60*60*1000),
            connectionAcknowledged: "connectionAcknowledged",
            connectionToken: "connectionToken",
            connectionTokenExpiry: new Date(new Date().getTime() + 22*60*60*1000),
        }));
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
        expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(0);
        jest.runOnlyPendingTimers();
        expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
    });

    test("end stops fetch interval", () => {
        baseConnectionHelper.start();
        jest.runOnlyPendingTimers();
        baseConnectionHelper.end();
        jest.runOnlyPendingTimers();
        expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
    });

    test("getTimeToConnectionTokenExpiry returns the expiry, not the date", () => {
    // expect that the expiry returned is a length in ms between now and the expiry date, not a date itself (in ms). 
    // A date (in ms) would be larger than this constant.
        expect(baseConnectionHelper.getTimeToConnectionTokenExpiry()).toBeLessThan(100000000);
    });

    describe("a bad connection token Expiry", () => {
        const flushPromises = () => new Promise(jest.requireActual("timers").setImmediate);
        const pollAndSettle = async () => {
            jest.runOnlyPendingTimers();
            await flushPromises();
        };

        test("stops polling with a warning when Expiry is missing", async () => {
            connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => undefined);
            const warn = jest.spyOn(baseConnectionHelper.logger, "warn");

            baseConnectionHelper.start();

            expect(jest.getTimerCount()).toBe(0);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("not a valid date"));
        });

        test("treats a null Expiry as missing, not as 1970", () => {
            connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => null);

            baseConnectionHelper.start();

            expect(jest.getTimerCount()).toBe(0);
        });

        test("stops polling when a refresh returns an unparseable Expiry", async () => {
            baseConnectionHelper.start();
            connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => "tomorrow");

            await pollAndSettle();

            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        });

        test("waits at least a minute between refreshes when Expiry stays in the past", async () => {
            baseConnectionHelper.start();
            connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => new Date(Date.now() - 60 * 60 * 1000));

            await pollAndSettle();
            jest.advanceTimersByTime(59 * 1000);
            await flushPromises();
            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);

            jest.advanceTimersByTime(1000);
            await flushPromises();
            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(2);
        });

        test("still refreshes right away on start when the token is about to expire", () => {
            connectionDetailsProvider.getConnectionTokenExpiry = jest.fn(() => new Date(Date.now() + 30 * 1000));

            baseConnectionHelper.start();
            jest.advanceTimersByTime(0);

            expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
        });
    });
});
