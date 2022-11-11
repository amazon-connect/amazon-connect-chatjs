import Utils from "./utils";
import { IllegalArgumentException } from "./core/exceptions";

describe("Utils", () => {
    describe(".delay()", () => {

        const delay = 1000;

        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("returns Promise that is resolved after X ms", () => {
            const fn = jest.fn();
            Utils.delay(delay).then(fn);
            jest.advanceTimersByTime(delay);
            Promise.resolve().then(() => {
                expect(fn).toHaveBeenCalled();
            });
        });

        it("returns Promise that is not resolved after X-1 ms", () => {
            const fn = jest.fn();
            Utils.delay(delay).then(fn);
            jest.advanceTimersByTime(delay - 1);
            Promise.resolve().then(() => {
                expect(fn).not.toHaveBeenCalled();
            });
        });
    });

    describe(".asyncWhileInterval()", () => {

        async function runTimersWithPromises() {
            await Promise.resolve();
            jest.runAllTimers();
            await Promise.resolve();
        }

        it("returns promise that resolves if first inner function resolves", () => {
            const promise = Utils.asyncWhileInterval(() => {
                return Promise.resolve('ok');
            }, (count) => count < 5, 0);
            expect(promise).resolves.toBe('ok');
        });

        it("returns promise that resolves if ANY inner function resolves", () => {
            const promise = Utils.asyncWhileInterval((counter) => {
                return counter === 3 ? Promise.resolve('ok') : Promise.reject();
            }, (count) => count < 5, 0);
            expect(promise).resolves.toBe('ok');
        });

        it("repeats execution until a resolved promise is returned", async () => {
            let numberOfExecutions = 0;
            await Utils.asyncWhileInterval((counter) => {
                numberOfExecutions += 1;
                return counter === 3 ? Promise.resolve('ok') : Promise.reject();
            }, (count) => count < 5, 0);
            expect(numberOfExecutions).toBe(4);
        });

        it("returns promise that rejects if all inner functions reject", () => {
            const promise = Utils.asyncWhileInterval(() => {
                return Promise.reject();
            }, (count) => count < 5, 0);
            expect(promise).rejects.toBeInstanceOf(Error);
        });

        it("applies delay correctly", async () => {
            jest.useFakeTimers();
            let date = 0;
            let numberOfExecutions = 0;
            /* eslint-disable no-global-assign */
            Date = jest.fn(() => date);
            Utils.asyncWhileInterval(() => {
                numberOfExecutions += 1;
                return Promise.reject();
            }, (count) => count < 5, 1000);
            jest.runAllTimers();
            await Promise.resolve();
            expect(numberOfExecutions).toBe(1);
            await runTimersWithPromises();
            expect(numberOfExecutions).toBe(2);
            await runTimersWithPromises();
            expect(numberOfExecutions).toBe(3);
            await runTimersWithPromises();
            expect(numberOfExecutions).toBe(4);
        });
    });

    describe("assertIsList()", () => {
        it("throws IllegalArgumentException if no inputs", () => {
            expect(() => Utils.assertIsList()).toThrow(IllegalArgumentException);
        });
        it("validates if input is a List", () => {
            expect(Utils.assertIsList([])).toEqual(undefined);
        });
    });
});
