import { GlobalConfig } from "../globalConfig";
import {
    getLdasEndpointUrl,
    CHAT_WIDGET_METRIC_NAME_SPACE,
    DEFAULT_WIDGET_TYPE
} from "../configs/csmConfig";
import { LogManager } from "../log";
import { csmJsString } from '../lib/connect-csm';
import { csmWorkerString } from '../lib/connect-csm-worker';

export const DIMENSION_CATEGORY = "Category";
class CsmService {
    constructor() {
        this.widgetType = DEFAULT_WIDGET_TYPE;
        this.logger = LogManager.getLogger({
            prefix: "ChatJS-csmService"
        });
        this.csmInitialized = false;
        this.metricsToBePublished = [];
        this.agentMetricToBePublished = [];
        this.MAX_RETRY = 5;
        this.loadCsmScriptAndExecute();
    }
  
    loadCsmScriptAndExecute() {
        try {
            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = csmJsString;
            document.head.appendChild(script);
        } catch (error) {
            this.logger.error("Load csm script error: ", error);
        }
    };
  
    initializeCSM() {
    // avoid multiple initialization
        if (this.csmInitialized) {
            return;
        }
        const region = GlobalConfig.getRegion();
        const csmWorkerText = csmWorkerString.replace(/\\/g, '');
        const sharedWorkerBlobUrl = URL.createObjectURL(new Blob([csmWorkerText], { type: 'text/javascript' }));
        const ldasEndpoint = getLdasEndpointUrl(region);
        let params = {
            endpoint: ldasEndpoint,
            namespace: CHAT_WIDGET_METRIC_NAME_SPACE,
            sharedWorkerUrl: sharedWorkerBlobUrl,
        };

        csm.initCSM(params);
        this.logger.info(`CSMService is initialized in ${region}`);
        this.csmInitialized = true;
        if (this.metricsToBePublished) {
            this.metricsToBePublished.forEach((metric) => {
                csm.API.addMetric(metric);
            });
            this.metricsToBePublished = null;
        }
    }

    updateCsmConfig(csmConfig) {
        this.widgetType = csmConfig.widgetType || this.widgetType;
    }

    getDefaultDimensions() {
        return [
            {
                name: "WidgetType",
                value: this.widgetType
            }
        ];
    }

    addMetric(metric) {
    // if csmService is never initialized, store the metrics in an array
        if (!this.csmInitialized) {
            if (this.metricsToBePublished) {
                this.metricsToBePublished.push(metric);
                this.logger.info(`CSMService is not initialized yet. Adding metrics to queue to be published once CSMService is initialized`);
            }
        } else {
            csm.API.addMetric(metric);
        }
    }

    setDimensions(metric, dimensions) {
        dimensions.forEach((dimension) => {
            metric.addDimension(dimension.name, dimension.value);
        });
    }

    addLatencyMetric(method, timeDifference, category, otherDimensions = []) {
        const latencyMetric = new csm.Metric(
            method,
            csm.UNIT.MILLISECONDS,
            timeDifference
        );
        const dimensions = [
            ...this.getDefaultDimensions(),
            {
                name: "Metric",
                value: "Latency",
            },
            {
                name: DIMENSION_CATEGORY,
                value: category
            },
            ...otherDimensions
        ];
        this.setDimensions(latencyMetric, dimensions);
        this.addMetric(latencyMetric);
        this.logger.debug(`Successfully published latency API metrics for method ${method}`);
    };

    addLatencyMetricWithStartTime(method, startTime, category, otherDimensions = []) {
        const endTime = new Date().getTime();
        const timeDifference = endTime - startTime;
        this.addLatencyMetric(method, timeDifference, category, otherDimensions);
        this.logger.debug(`Successfully published latency API metrics for method ${method}`);
    }

    addCountAndErrorMetric(method, category, error, otherDimensions = []) {
        const dimensions = [
            ...this.getDefaultDimensions(),
            {
                name: DIMENSION_CATEGORY,
                value: category
            },
            ...otherDimensions
        ];
        const countMetric = new csm.Metric(method, csm.UNIT.COUNT, 1);
        this.setDimensions(countMetric, [
            ...dimensions,
            {
                name: "Metric",
                value: "Count",
            }
        ]);
        const errorCount = error ? 1 : 0;
        const errorMetric = new csm.Metric(method, csm.UNIT.COUNT, errorCount);
        this.setDimensions(errorMetric, [
            ...dimensions,
            {
                name: "Metric",
                value: "Error",
            }
        ]);
        this.addMetric(countMetric);
        this.addMetric(errorMetric);
        this.logger.debug(`Successfully published count and error metrics for method ${method}`);
    };

    addCountMetric(method, category, otherDimensions = []) {
        const dimensions = [
            ...this.getDefaultDimensions(),
            {
                name: DIMENSION_CATEGORY,
                value: category
            },
            {
                name: "Metric",
                value: "Count",
            },
            ...otherDimensions
        ];
        const countMetric = new csm.Metric(method, csm.UNIT.COUNT, 1);
        this.setDimensions(countMetric, dimensions);
        this.addMetric(countMetric);
        this.logger.debug(`Successfully published count metrics for method ${method}`);
    }

    addAgentCountMetric(metricName, count) {
        const _self = this;
        if (csm?.API?.addCount && metricName) {
            csm.API.addCount(metricName, count);
            _self.MAX_RETRY = 5;
        } else {
            //add to list and retry later
            if (metricName) {
                this.agentMetricToBePublished.push({
   
                    metricName,
   
                    count
                });
            }
            setTimeout(() => {
                if (csm?.API?.addCount) {
                    this.agentMetricToBePublished.forEach(metricItem => {
                        csm.API.addCount(metricItem.metricName, metricItem.count);
                    });
                    this.agentMetricToBePublished = [];
                } else if(_self.MAX_RETRY > 0) {
                    _self.MAX_RETRY -= 1;
                    _self.addAgentCountMetric();
                }
            }, 3000);
        }
    }
}

const csmService = new CsmService();
export { csmService };