import { CUSTOM_CCP_NAME, STREAM_METRIC_TYPES } from "./constants";
import { LogManager } from "./log";
const logger = LogManager.getLogger({ prefix: "ChatJS-GlobalConfig" });

const StreamMetricUtils = {};

/**
 * A helper function uses the Steams.js to publish metrics to LDAS - CCPv2 name space
 * Based on the logic of the publishNativeCustomCCPMetrics function in AmazonConnectCCPUI package,
 * The metric needs to follow certain patterns to order to be published:
 * 1) Metric must contain the customCCPName key-value pair.
 * 2) The value of customCCPName value must be included in SUPPORTED_NATIVE_CUSTOM_CCPS list within the AmazonConnectCCPUI package.
 * 3) The Metric Type must be one of the three types - SuccessMetric; EventMetric; LatencyMetric.
 * 4) The Metric name must be in the format of <customCCPName><MetricType>.
 * 
 * Example of a valid metric for error:
 * source: https://code.amazon.com/packages/AmazonConnectCCPUI/blobs/d5aabb168c8f847630c0585c4ed486e2be17e455/--/src/services/CSMService.js#L578
 * window.connect.publishMetric({
 *     name: "ChatJSSuccessMetric",  
 *     data: {
 *         count: 0
 *     },
 *     dimensions: {
 *         category: "StreamJS-2.18.1-ChatJSCreateSessionError",
 *         errorType: 'InternalServerError',
 *         streamsJSVersion: "2.18.1", // based on window.connect.version
 *         chatJSVersion: "1.0.0", // based on window.connect.ChatJSVersion
 *     }
 * })
 * @param metric Metric to be published
 */
StreamMetricUtils.publishMetric = function (metric) {
    if (!window.connect.publishMetric) return;

    window.connect?.publishMetric (
        {
            ...metric,
            customCCPName: CUSTOM_CCP_NAME,
        }
    );

    logger.info("publishMetric - The published Metric is", metric);
};

/**
 * Method to publish the StreamJS Error metric
 * Based on the logic of the publishNativeCustomCCPMetrics function in AmazonConnectCCPUI package,
 * for error related  metrics, the metric type should be SuccessMetric with the data.count = 0
 * for now, it only accept the errorType and category dimensions. 
 * TODO - update the publishNativeCustomCCPMetrics function to allowlist the streamsJSVersion and chatJSVersion dimensions
 * @param metricName Error Metric name 
 * @param errorType Error type of the Error Metric
 */
StreamMetricUtils.publishError = function (metricName, errorType) {
    let errorMetric = {
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
    };
    StreamMetricUtils.publishMetric(errorMetric);

    logger.info("publishErrorMetric - The Error Metric is", errorMetric);

};

export default StreamMetricUtils;