export const csmWorkerString = `(function() {
  const global = self;
  const csm = global.csm || {};
  global.csm = csm;

  csm.EVENT_TYPE = {
    LOG: 'LOG',
    METRIC: 'METRIC',
    CONFIG: 'CONFIG',
    WORKFLOW_EVENT: 'WORKFLOW_EVENT',
    CUSTOM: 'CUSTOM',
    CLOSE: 'CLOSE',
    SET_AUTH: 'SET_AUTH',
    SET_CONFIG: 'SET_CONFIG',
  };

  csm.UNIT = {
    COUNT: 'Count',
    SECONDS: 'Seconds',
    MILLISECONDS: 'Milliseconds',
    MICROSECONDS: 'Microseconds',
  };
})();

(function() {
  const global = self;
  const csm = global.csm || {};
  global.csm = csm;

  const MAX_METRIC_DIMENSIONS = 10;

  /** ********* Dimension Classes ***********/

  const Dimension = function(name, value) {
    csm.Util.assertExist(name, 'name');
    csm.Util.assertExist(value, 'value');

    this.name = name;
    this.value = value == null ? 'null' : (value === '' ? ' ' : value.toString());
  };


  /** ********* Metric Classes ***********/

  const Metric = function(metricName, unit, value, dedupeOptions) {
    csm.Util.assertExist(metricName, 'metricName');
    csm.Util.assertExist(value, 'value');
    csm.Util.assertExist(unit, 'unit');
    csm.Util.assertTrue(csm.Util.isValidUnit(unit));
    if (dedupeOptions) {
      csm.Util.assertInObject(dedupeOptions, 'dedupeOptions', 'dedupeIntervalMs');
    }

    this.metricName = metricName;
    this.unit = unit;
    this.value = value;
    this.timestamp = new Date();
    this.dimensions = csm.globalDimensions ? csm.Util.deepCopy(csm.globalDimensions): [];
    this.namespace = csm.configuration.namespace;
    this.dedupeOptions = dedupeOptions; // optional. { dedupeIntervalMs: (int; required), context: (string; optional) }

    // Currently, CloudWatch can't aggregate metrics by a subset of dimensions.
    // To bypass this limitation, we introduce the optional dimensions concept to CSM.
    // The CSM metric publisher will publish a default metric without optional dimension
    // For each optional dimension, the CSM metric publisher publishes an extra metric with that dimension.
    this.optionalDimensions = csm.globalOptionalDimensions ? csm.Util.deepCopy(csm.globalOptionalDimensions): [];
  };

  Metric.prototype.addDimension = function(name, value) {
    this._addDimensionHelper(this.dimensions, name, value);
  };

  Metric.prototype.addOptionalDimension = function(name, value) {
    this._addDimensionHelper(this.optionalDimensions, name, value);
  };

  Metric.prototype._addDimensionHelper = function(targetDimensions, name, value) {
    // CloudWatch metric allows maximum 10 dimensions
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudWatch.html#putMetricData-property
    if ((this.dimensions.length + this.optionalDimensions.length) >= MAX_METRIC_DIMENSIONS) {
      throw new csm.ExceedDimensionLimitException(name);
    }

    const existing = targetDimensions.find(function(dimension) {
      return dimension.name === name;
    });

    if (existing) {
      existing.value = value == null ? 'null' : (value === '' ? ' ' : value.toString());
    } else {
      targetDimensions.push(new Dimension(name, value));
    }
  };


  /** ********* Telemetry Classes ***********/

  const WorkflowEvent = function(params) {
    this.timestamp = params.timestamp || new Date().getTime();
    this.workflowType = params.workflow.type;
    this.instanceId = params.workflow.instanceId;
    this.userId = params.userId;
    this.organizationId = params.organizationId;
    this.accountId = params.accountId;
    this.event = params.event;
    this.appName = params.appName;
    this.data = [];

    // Convert 'data' map into the KeyValuePairList structure expected by the Lambda API
    for (const key in params.data) {
      if (Object.prototype.hasOwnProperty.call(params.data, key)) {
        this.data.push({'key': key, 'value': params.data[key]});
      }
    }
  };

  /** ********* Exceptions ***********/

  const NullOrUndefinedException = function(paramName) {
    this.name = 'NullOrUndefinedException';
    this.message = paramName + ' is null or undefined. ';
  };
  NullOrUndefinedException.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };

  const AssertTrueException = function() {
    this.name = 'AssertTrueException';
    this.message = 'Assertion failed. ';
  };
  AssertTrueException.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };

  const ExceedDimensionLimitException = function(dimensionName) {
    this.name = 'ExceedDimensionLimitException';
    this.message = 'Could not add dimension ' + dimensionName + ' . Metric has maximum 10 dimensions. ';
  };
  ExceedDimensionLimitException.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };

  const InitializationException = function() {
    this.name = 'InitializationException';
    this.message = 'Initialization failed. ';
  };
  InitializationException.prototype.toString = function() {
    return this.name + ': ' + this.message;
  };


  csm.Dimension = Dimension;
  csm.Metric = Metric;
  csm.WorkflowEvent = WorkflowEvent;
  csm.NullOrUndefinedException = NullOrUndefinedException;
  csm.AssertTrueException = AssertTrueException;
  csm.InitializationException = InitializationException;
  csm.ExceedDimensionLimitException = ExceedDimensionLimitException;
})();

(function() {
  const global = self;
  const csm = global.csm || {};
  global.csm = csm;

  const validTimeUnits = [csm.UNIT.SECONDS, csm.UNIT.MILLISECONDS, csm.UNIT.MICROSECONDS];
  const validUnits = validTimeUnits.concat(csm.UNIT.COUNT);

  const Util = {
    assertExist: function(value, paramName) {
      if (value === null || value === undefined) {
        throw new csm.NullOrUndefinedException(paramName);
      }
    },
    assertTrue: function(value) {
      if (!value) {
        throw new csm.AssertTrueException();
      }
    },
    assertInObject: function(obj, objName, key) {
      if (obj === null || obj === undefined || typeof obj !== 'object') {
        throw new csm.NullOrUndefinedException(objName);
      }
      if (key === null || key === undefined || !obj[key]) {
        throw new csm.NullOrUndefinedException(\`\${objName}[\${key}]\`);
      }
    },
    isValidUnit: function(unit) {
      return validUnits.includes(unit);
    },
    isValidTimeUnit: function(unit) {
      return validTimeUnits.includes(unit);
    },
    isEmpty: function(value) {
      if (value !== null && typeof val === 'object') {
        return Objects.keys(value).length === 0;
      }
      return !value;
    },
    deepCopy: function(obj) {
      // NOTE: this will fail if obj has a circular reference
      return JSON.parse(JSON.stringify(obj));
    },

    /**
     * This function is used before setting the page location for default metrics and logs,
     * and the APIs that set page location
     * Can be overridden by calling csm.API.setPageLocationTransformer(function(){})
     * @param {string}        pathname path for page location
     * @return {string}       pathname provided
     */
    pageLocationTransformer: function(pathname) {
      return pathname;
    },

    /**
     * As of now, our service public claims only support for Firefox and Chrome
     * Reference https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent
     *
     * This function will only return firefox, chrome and others
     *
     * Best practice as indicated in MDN, "Avoiding user agent detection"
     */
    getBrowserDetails: function() {
      const userAgent = window.navigator.userAgent;
      const details = {};
      if (userAgent.includes('Firefox') && !userAgent.includes('Seamonkey')) {
        details.name = 'Firefox';
        details.version = getBrowserVersion('Firefox');
      } else if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) {
        details.name = 'Chrome';
        details.version = getBrowserVersion('Chrome');
      }
    },

    randomId: function() {
      return new Date().getTime() + '-' + Math.random().toString(36).slice(2);
    },

    getOrigin: function() {
      return document.location.origin;
    },

    getReferrerUrl: function() {
      const referrer = document.referrer || '';
      return this.getURLOrigin(referrer);
    },

    getWindowParent: function() {
      let parentLocation = '';
      try {
        parentLocation = window.parent.location.href;
      } catch (e) {
        parentLocation = '';
      }
      return parentLocation;
    },

    getURLOrigin: function(urlValue) {
      let origin = '';
      const originArray = urlValue.split( '/' );
      if (originArray.length >= 3) {
        const protocol = originArray[0];
        const host = originArray[2];
        origin = protocol + '//' + host;
      }
      return origin;
    },

  };

  const getBrowserVersion = function(browserName) {
    const userAgent = window.navigator.userAgent;
    const browserNameIndex = userAgent.indexOf(browserName);
    const nextSpaceIndex = userAgent.indexOf(' ', browserNameIndex);
    if (nextSpaceIndex === -1) {
      return userAgent.substring(browserNameIndex + browserName.length + 1, userAgent.length);
    } else {
      return userAgent.substring(browserNameIndex + browserName.length + 1, nextSpaceIndex);
    }
  };

  csm.Util = Util;
})();

(function() {
  const XHR_DONE_READY_STATE = 4; // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/readyState

  const global = self;
  const configuration = {};
  const batchSettings = {
    maxMetricsSize: 30,
    maxWorkflowEventsSize: 30,
    putMetricsIntervalMs: 30000,
    putWorkflowEventsIntervalMs: 2000,
  };
  const metricLists = {}; // metricList per CloudWatch Namespace
  const metricMap = {};
  const ports = {};
  let workflowEvents = {workflowEventList: []};

  // SharedWorker wiki:  https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
  onconnect = function(connectEvent) {
    const port = connectEvent.ports[0];

    port.onmessage = function(event) {
      const data = event.data;
      const messageType = data.type;
      const message = data.message;
      const endpoint = data.endpoint;
      const headers = data.headers;

      if (data.portId && !(data.portId in ports)) {
        // This could happen when a user tries to close a tab which has a pop up alert to confirm closing,
        // and the user decides to cancel closing
        // This triggers before unload event while the tab or window is not closed actually
        ports[data.portId] = port;
      }

      const {METRIC, WORKFLOW_EVENT, CUSTOM, CONFIG, SET_AUTH, SET_CONFIG, CLOSE} = csm.EVENT_TYPE;
      switch (messageType) {
        case METRIC: {
          csm.Util.assertInObject(message, 'message', 'namespace');
          const namespace = message.namespace;
          if (shouldDedupe(message)) break;
          addMetricEventToMap(message);
          if (metricLists[namespace]) {
            metricLists[namespace].push(message);
          } else {
            metricLists[namespace] = [message];
          }
          if (metricLists[namespace].length >= batchSettings.maxMetricsSize) {
            putMetricsForNamespace(namespace);
          }
          break;
        }
        case WORKFLOW_EVENT: {
          workflowEvents.workflowEventList.push(message);
          if (workflowEvents.length >= batchSettings.maxWorkflowEventsSize) {
            putWorkflowEvents();
          }
          break;
        }
        case CUSTOM: {
          putCustom(endpoint, headers, message);
          break;
        }
        case CONFIG: {
          const portId = Object.keys(ports).length + 1; // portId starts from 1
          ports[portId] = port;
          for (const setting of Object.keys(message)) {
            if (!csm.Util.isEmpty(message[setting])) {
              configuration[setting] = message[setting];
            }
          }

          // set optional batch settings
          if (configuration.batchSettings) {
            for (const setting of Object.keys(configuration.batchSettings)) {
              batchSettings[setting] = configuration.batchSettings[setting];
            }
          }
          // send metrics and workflow events at set intervals
          putMetrics();
          putWorkflowEvents();
          global.setInterval(putMetrics, batchSettings.putMetricsIntervalMs);
          global.setInterval(putWorkflowEvents, batchSettings.putWorkflowEventsIntervalMs);

          port.postMessage(
              {
                type: csm.EVENT_TYPE.CONFIG,
                portId: portId,
              },
          );
          break;
        }
        case SET_AUTH: {
          configuration.authParams = message;
          authenticate();
          break;
        }
        case SET_CONFIG: {
          configuration[message.key] = message.value;
          break;
        }
        case CLOSE: {
          delete ports[data.portId];
          if (Object.keys(ports).length === 0) {
            putMetrics();
            putWorkflowEvents();
          }
          break;
        }
        default:
          break;
      }
    };
  };

  const shouldDedupe = function(metric) {
    try {
      const pastMetric = getPastMetricEvent(metric);
      return pastMetric && metric.dedupeOptions &&
        (metric.timestamp - pastMetric.timestamp < metric.dedupeOptions.dedupeIntervalMs);
    } catch (err) {
      console.error('Error in shouldDedupe', err);
      return false;
    }
  };

  const getPastMetricEvent = function(metric) {
    try {
      return metricMap[getMetricEventKey(metric)];
    } catch (err) {
      // ignore err - no previous metrics found
      return null;
    }
  };

  const addMetricEventToMap = function(metric) {
    try {
      metricMap[getMetricEventKey(metric)] = metric;
    } catch (err) {
      console.error('Failed to add event to metricMap', err);
    }
    csm.metricMap = metricMap;
  };

  const getMetricEventKey = function(metric) {
    const {namespace, metricName, unit, dedupeOptions} = metric;
    let context = 'global';
    if (dedupeOptions && dedupeOptions.context) {
      context = dedupeOptions.context;
    }
    return \`\${namespace}-\${metricName}-\${unit}-\${context}\`;
  };

  const authenticate = function() {
    postRequest(configuration.endpointUrl + '/auth', {authParams: configuration.authParams},
        {
          success: function(response) {
            if (response && response.jwtToken) {
              configuration.authParams.jwtToken = response.jwtToken;
            }
          },
          failure: function(response) {
            broadcastMessage('[ERROR] csm auth failed!');
            broadcastMessage('Response : ' + response);
          },
        }, {'x-api-key': 'auth-method-level-key'});
  };

  /**
   * Put metrics to service when:
   * a) metricList size is at maxMetricsSize
   * b) every putMetricsIntervalMs time if the metricList is not empty
   * c) worker is closed
   *
   * Timer is reset, and metricList emptied after each putMetrics call
   */
  const putMetrics = function() {
    for (const namespace of Object.keys(metricLists)) {
      putMetricsForNamespace(namespace);
    }
  };

  const putMetricsForNamespace = function(namespace) {
    csm.Util.assertInObject(metricLists, 'metricLists', namespace);
    const metricList = metricLists[namespace];

    if (metricList.length > 0 && !configuration.dryRunMode && configuration.endpointUrl) {
      postRequest(configuration.endpointUrl + '/put-metrics', {
        metricNamespace: namespace,
        metricList: metricList,
        authParams: configuration.authParams,
        accountId: configuration.accountId,
        organizationId: configuration.organizationId,
        agentResourceId: configuration.userId,
      }, {
        success: function(response) {
          if (response) {
            broadcastMessage('PutMetrics response : ' + response);
            if (response.unsetToken) {
              delete configuration.authParams.jwtToken;
              authenticate();
            }
          }
        },
        failure: function(response) {
          broadcastMessage('[ERROR] Put metrics to service failed! ');
        },
      });
    }
    metricLists[namespace] = [];
  };

  /**
   * Put metrics to service every two seconds if there are events to be put.
   */
  const putWorkflowEvents = function() {
    if (workflowEvents.workflowEventList.length > 0 && !configuration.dryRunMode && configuration.endpointUrl) {
      workflowEvents.authParams = configuration.authParams;
      postRequest(configuration.endpointUrl + '/put-workflow-events', workflowEvents,
          {
            success: function(response) {
              if (response) {
                if (response.workflowEventList && response.workflowEventList.length > 0) {
                  broadcastMessage('[WARN] There are ' + response.length + ' workflow events that failed to publish');
                  broadcastMessage('Response : ' + response);
                }
                if (response.unsetToken) {
                  delete configuration.authParams.jwtToken;
                  authenticate();
                }
              }
            },
            failure: function(response) {
              broadcastMessage('[ERROR] Put workflow events to service failed! ');
            },
          });
    }

    workflowEvents = {workflowEventList: []};
  };

  /**
   * Put data to custom endpoint on demand
   * @param {string} endpoint
   * @param {object} headers
   * @param {object} data to send to endpoint
   */
  const putCustom = function(endpoint, headers, data) {
    if (!configuration.dryRunMode && endpoint && data) {
      postRequest(endpoint, data, {
        success: function(response) {
          if (response) {
            broadcastMessage('Response : ' + response);
          }
        },
        failure: function(response) {
          broadcastMessage('[ERROR] Failed to put custom data! ');
        },
      }, headers);
    }
  };

  /**
   * Broadcast message to all tabs
   * @param {string} message to post to all the tabs
   */
  const broadcastMessage = function(message) {
    for (const portId in ports) {
      if (Object.prototype.hasOwnProperty.call(ports, portId)) {
        ports[portId].postMessage(message);
      }
    }
  };

  const postRequest = function(url, data, callbacks, headers) {
    csm.Util.assertExist(url, 'url');
    csm.Util.assertExist(data, 'data');

    callbacks = callbacks || {};
    callbacks.success = callbacks.success || function() {};
    callbacks.failure = callbacks.failure || function() {};

    const request = new XMLHttpRequest(); // new HttpRequest instance
    request.onreadystatechange = function() {
      const errorList = request.response ? JSON.parse(request.response): [];
      if (request.readyState === XHR_DONE_READY_STATE) { // request finished and response is ready
        if (request.status === 200) {
          callbacks.success(errorList);
        } else {
          broadcastMessage('AJAX request failed with status: ' + request.status);
          callbacks.failure(errorList);
        }
      }
    };

    request.open('POST', url);
    if (headers && typeof headers === 'object') {
      Object.keys(headers).forEach((header) => request.setRequestHeader(header, headers[header]));
    } else {
      request.setRequestHeader('Content-Type', 'application/json');
    }
    request.send(JSON.stringify(data));
  };
})()`;
