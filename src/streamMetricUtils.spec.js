import StreamMetricUtils from "./streamMetricUtils";
import { CUSTOM_CCP_NAME, STREAM_METRIC_TYPES } from "./constants";
import { LogManager } from "./log";

jest.mock("./log", () => ({
  LogManager: {
    getLogger: jest.fn().mockReturnValue({
      info: jest.fn()
    })
  }
}));

describe("StreamMetricUtils", () => {
  // Store original window object
  const originalWindow = global.window;
  
  beforeEach(() => {
    // Setup window object if it doesn't exist
    if (typeof global.window === 'undefined') {
      global.window = {};
    }
    
    // Setup connect object
    global.window.connect = {
      publishMetric: jest.fn(),
      version: "2.18.1",
      ChatJSVersion: "3.0.6"
    };
  });
  
  afterEach(() => {
    // Restore original window object
    global.window = originalWindow;
    jest.clearAllMocks();
  });
  
  describe(".publishMetric()", () => {
    it("should call window.connect.publishMetric with the metric and customCCPName", () => {
      // Arrange
      const metric = {
        name: "TestMetric",
        data: { count: 1 }
      };
      
      // Act
      StreamMetricUtils.publishMetric(metric);
      
      // Assert
      expect(window.connect.publishMetric).toHaveBeenCalledWith({
        ...metric,
        customCCPName: CUSTOM_CCP_NAME
      });
    });
    
    it("should log the metric being published", () => {
      // Arrange
      const metric = {
        name: "TestMetric",
        data: { count: 1 }
      };
      const logger = LogManager.getLogger();
      
      // Act
      StreamMetricUtils.publishMetric(metric);
      
      // Assert
      expect(logger.info).toHaveBeenCalledWith("publishMetric - The published Metric is", metric);
    });
    
    it("should not throw when publishMetric doesn't exist", () => {
      // Arrange
      const metric = {
        name: "TestMetric",
        data: { count: 1 }
      };
      delete window.connect.publishMetric;
      
      // Act & Assert
      expect(() => StreamMetricUtils.publishMetric(metric)).not.toThrow();
    });
  });
  
  describe(".publishError()", () => {
    it("should create an error metric with the correct format", () => {
      // Arrange
      const metricName = "StreamJS-2.18.1-ChatJSCreateSessionError";
      const errorType = "InternalServerError";
      
      // Mock the publishMetric function
      const publishMetricSpy = jest.spyOn(StreamMetricUtils, "publishMetric").mockImplementation(() => {});
      
      // Act
      StreamMetricUtils.publishError(metricName, errorType);
      
      // Assert
      expect(publishMetricSpy).toHaveBeenCalledWith({
        name: `${CUSTOM_CCP_NAME}${STREAM_METRIC_TYPES.SUCCESS_METRIC}`,
        data: {
          count: 0
        },
        dimensions: {
          category: metricName,
          errorType: errorType,
          streamsJSVersion: window.connect.version,
          chatJSVersion: window.connect.ChatJSVersion,
        }
      });
    });
    
    it("should log the error metric being published", () => {
      // Arrange
      const metricName = "StreamJS-2.18.1-ChatJSCreateSessionError";
      const errorType = "InternalServerError";
      const logger = LogManager.getLogger();
      
      // Mock the publishMetric function to avoid actual call
      jest.spyOn(StreamMetricUtils, "publishMetric").mockImplementation(() => {});
      
      // Act
      StreamMetricUtils.publishError(metricName, errorType);
      
      // Assert
      expect(logger.info).toHaveBeenCalledWith(
        "publishErrorMetric - The Error Metric is", 
        {
          name: `${CUSTOM_CCP_NAME}${STREAM_METRIC_TYPES.SUCCESS_METRIC}`,
          data: {
            count: 0
          },
          dimensions: {
            category: metricName,
            errorType: errorType,
            streamsJSVersion: window.connect.version,
            chatJSVersion: window.connect.ChatJSVersion,
          }
        }
      );
    });
  });
});