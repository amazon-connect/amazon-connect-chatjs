import BaseConnectionHelper from "./baseConnectionHelper";
import { CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS } from "../../constants";

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
        delete connectionDetailsProvider.isTokenless;
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

    test("stops polling once a refresh turns the session tokenless", async () => {
        connectionDetailsProvider.isTokenless = jest.fn(() => false);
        baseConnectionHelper.start();
        connectionDetailsProvider.isTokenless.mockReturnValue(true);
        connectionDetailsProvider.getConnectionTokenExpiry.mockReturnValue(null);

        jest.runOnlyPendingTimers();
        await Promise.resolve();
        jest.advanceTimersByTime(CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS * 3);

        expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
    });

    describe("tokenless session", () => {
        beforeEach(() => {
            connectionDetailsProvider.isTokenless = jest.fn(() => true);
        });

        test("does not poll for a connection token that will never arrive", () => {
            baseConnectionHelper.start();
            jest.advanceTimersByTime(CONNECTION_TOKEN_POLLING_INTERVAL_IN_MS * 3);
            expect(connectionDetailsProvider.fetchConnectionDetails).not.toHaveBeenCalled();
        });

        test("end is safe when no timer was ever set", () => {
            baseConnectionHelper.start();
            expect(() => baseConnectionHelper.end()).not.toThrow();
        });
    });

    test("still polls when the session has a connection token", () => {
        connectionDetailsProvider.isTokenless = jest.fn(() => false);
        baseConnectionHelper.start();
        jest.runOnlyPendingTimers();
        expect(connectionDetailsProvider.fetchConnectionDetails).toHaveBeenCalledTimes(1);
    });

    test("still refreshes immediately when the expiry is genuinely in the past", () => {
        connectionDetailsProvider.getConnectionTokenExpiry =
            jest.fn(() => new Date(new Date().getTime() - 60 * 1000));
        expect(baseConnectionHelper.getTimeToConnectionTokenExpiry()).toBeLessThan(0);
    });
});
