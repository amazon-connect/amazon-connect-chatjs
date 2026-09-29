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
