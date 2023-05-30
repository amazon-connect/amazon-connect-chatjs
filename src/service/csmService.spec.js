import { csmService, DIMENSION_CATEGORY } from "./csmService";
import {
    CHAT_WIDGET_METRIC_NAME_SPACE,
    DEFAULT_WIDGET_TYPE,
} from "../config/csmConfig";
import * as CsmConfig from "../config/csmConfig";
import { GlobalConfig } from "../globalConfig";

jest.useFakeTimers();
jest.spyOn(global, 'setTimeout');
const mockCsmConfig = {
    widgetType: "test-widget-type"
};

const mockCategory = "test-category";
const mockMethod = "test-method";
const mockStartTime = 0;
const mockError = 0;
const mockCsmUnit = {
    COUNT: 'Count',
    SECONDS: 'Seconds',
    MILLISECONDS: 'Milliseconds',
    MICROSECONDS: 'Microseconds',
};
const mockObjectUrl = "test-object-url";
const mockLdasEndpoint = "test-ldas-endpoint";
const mockOtherDimension = [
    {
        name: "otherKey",
        value: "otherValue"
    }
];

describe("Common csmService tests", () => {
    let mockAddDimension, mockCsmMetric, mockAddMetric, mockInitCSM, csmMetric;

    beforeEach(() => {
        jest.resetAllMocks();
        GlobalConfig.updateStageRegionCell({
            stage: "test",
            region: "us-west-2",
        });
        mockAddDimension = jest.fn();
        mockCsmMetric = jest.fn();
        mockAddMetric = jest.fn();
        mockInitCSM = jest.fn();
        csmMetric = {
            addDimension: mockAddDimension
        };
        jest.spyOn(CsmConfig, 'getLdasEndpointUrl').mockReturnValue(mockLdasEndpoint);

        global.URL.createObjectURL = jest.fn().mockReturnValue(mockObjectUrl);
        global.fetch = () =>
            Promise.resolve({
                text: () => Promise.resolve([]),
            });
        global.csm = {
            initCSM: mockInitCSM,
            UNIT: mockCsmUnit,
            Metric: mockCsmMetric.mockImplementation(() => {
                return csmMetric;
            }),
            API: {
                addMetric: mockAddMetric
            },
        };
        process.env = {};
        csmService.csmInitialized = false;
        csmService.metricsToBePublished = [];
    });

    describe("normal cases", () => {
        beforeEach(() => {
            csmService.initializeCSM();
        });

        it("should be able to initialize CSM", () => {
            expect(csmService.widgetType).toBe(DEFAULT_WIDGET_TYPE);
            expect(mockInitCSM).toHaveBeenCalledWith({
                endpoint: mockLdasEndpoint,
                namespace: CHAT_WIDGET_METRIC_NAME_SPACE,
                sharedWorkerUrl: mockObjectUrl,
            });
        });

        it("should only initialize CSM once", () => {
            expect(csmService.csmInitialized).toBe(true);
            csmService.initializeCSM();
            expect(mockInitCSM).toHaveBeenCalledTimes(1);
        });

        it("should be able to update CSM config", () => {
            expect(csmService.csmInitialized).toBe(true);
            csmService.updateCsmConfig(mockCsmConfig);
            expect(csmService.widgetType).toBe(mockCsmConfig.widgetType);
        });

        it("should be able to add latency metrics", () => {
            expect(csmService.csmInitialized).toBe(true);
            csmService.addLatencyMetricWithStartTime(mockMethod, mockStartTime, mockCategory, mockOtherDimension);
            expect(mockAddDimension).toHaveBeenCalledTimes(4);
            expect(mockAddDimension).toHaveBeenNthCalledWith(1, "WidgetType", mockCsmConfig.widgetType);
            expect(mockAddDimension).toHaveBeenNthCalledWith(2, "Metric", "Latency");
            expect(mockAddDimension).toHaveBeenNthCalledWith(3, DIMENSION_CATEGORY, mockCategory);
            expect(mockAddDimension).toHaveBeenNthCalledWith(4, "otherKey", "otherValue");
            expect(mockCsmMetric).toHaveBeenCalledWith(mockMethod, csm.UNIT.MILLISECONDS, expect.anything());
            expect(mockAddMetric).toHaveBeenCalledWith(csmMetric);
        });

        it("should be able to add error and count metrics", () => {
            expect(csmService.csmInitialized).toBe(true);
            csmService.addCountAndErrorMetric(mockMethod, mockCategory, mockError, mockOtherDimension);
            expect(mockAddDimension).toHaveBeenCalledTimes(8);
            expect(mockAddDimension).toHaveBeenNthCalledWith(1, "WidgetType", mockCsmConfig.widgetType);
            expect(mockAddDimension).toHaveBeenNthCalledWith(2, DIMENSION_CATEGORY, mockCategory);
            expect(mockAddDimension).toHaveBeenNthCalledWith(3, "otherKey", "otherValue");
            expect(mockAddDimension).toHaveBeenNthCalledWith(4, "Metric", "Count");
            expect(mockAddDimension).toHaveBeenNthCalledWith(5, "WidgetType", mockCsmConfig.widgetType);
            expect(mockAddDimension).toHaveBeenNthCalledWith(6, DIMENSION_CATEGORY, mockCategory);
            expect(mockAddDimension).toHaveBeenNthCalledWith(7, "otherKey", "otherValue");
            expect(mockAddDimension).toHaveBeenNthCalledWith(8, "Metric", "Error");
            expect(mockAddDimension).toHaveBeenCalledWith("WidgetType", mockCsmConfig.widgetType);
            expect(mockCsmMetric).toHaveBeenNthCalledWith(1, mockMethod, csm.UNIT.COUNT, 1);
            expect(mockCsmMetric).toHaveBeenNthCalledWith(2, mockMethod, csm.UNIT.COUNT, mockError);
            expect(mockAddMetric).toHaveBeenNthCalledWith(1, csmMetric);
            expect(mockAddMetric).toHaveBeenNthCalledWith(2, csmMetric);
        });

        it("should be able to add count metrics", () => {
            expect(csmService.csmInitialized).toBe(true);
            csmService.addCountMetric(mockMethod, mockCategory, mockOtherDimension);
            expect(mockAddDimension).toHaveBeenCalledTimes(4);
            expect(mockAddDimension).toHaveBeenNthCalledWith(1, "WidgetType", mockCsmConfig.widgetType);
            expect(mockAddDimension).toHaveBeenNthCalledWith(2, DIMENSION_CATEGORY, mockCategory);
            expect(mockAddDimension).toHaveBeenNthCalledWith(3, "Metric", "Count");
            expect(mockAddDimension).toHaveBeenNthCalledWith(4, "otherKey", "otherValue");
            expect(mockCsmMetric).toHaveBeenCalledWith(mockMethod, csm.UNIT.COUNT, 1);
            expect(mockAddMetric).toHaveBeenCalledWith(csmMetric);
        });
    });

    describe("publish metrics before csmService is initialized", () => {
        beforeEach(() => {
            csmService.addLatencyMetricWithStartTime(mockMethod, mockStartTime, mockCategory);
            csmService.addCountAndErrorMetric(mockMethod, mockCategory, mockError);
            csmService.addCountMetric(mockMethod, mockCategory);
            expect(csmService.metricsToBePublished).toHaveLength(4);
            expect(mockInitCSM).not.toHaveBeenCalled();
            expect(mockAddMetric).not.toHaveBeenCalled();
            csmService.initializeCSM();
        });

        it("metrics queue should be cleared once CSM is initialized", () => {
            csmService.addLatencyMetricWithStartTime(mockMethod, mockStartTime, mockCategory);
            csmService.addCountAndErrorMetric(mockMethod, mockCategory, mockError);
            csmService.addCountMetric(mockMethod, mockCategory);
            expect(csmService.metricsToBePublished).toBeNull();
        });

        it("should not be able to publish metrics before csmService is initialized, which should be then published once csmService is initialized", () => {
            expect(mockInitCSM).toHaveBeenCalled();
            expect(mockAddMetric).toHaveBeenCalledTimes(4);
        });
    });

    describe("publish metric for Agent", () => {
        it("should call addCount to add metric", () => {
            csm.API.addCount = jest.fn();
            csmService.addAgentCountMetric("test", 1);
            expect(csm.API.addCount).toHaveBeenCalled();
            expect(csm.API.addCount).toHaveBeenCalledWith("test", 1);
        });
        it("should call addCount to add metric", () => {
            csm.API.addCount = undefined;
            csmService.addAgentCountMetric("test", 1);
            expect(csmService.agentMetricToBePublished).toEqual([{
                count: 1,
                metricName: "test"
            }]);
            expect(setTimeout).toHaveBeenCalledTimes(1);
            expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3000);
            expect(csmService.MAX_RETRY).toEqual(5);
            while(csmService.MAX_RETRY > 0) {
                setTimeout.mock.calls[5-csmService.MAX_RETRY][0]();
            }
            expect(csmService.MAX_RETRY).toEqual(0);
            csm.API.addCount = jest.fn();
            setTimeout.mock.calls[0][0]();
            expect(csm.API.addCount).toHaveBeenCalled();
            expect(csm.API.addCount).toHaveBeenCalledWith("test", 1);
        });
    });
});