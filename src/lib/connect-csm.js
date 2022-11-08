export const csmJsString = `(function() {
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
    this.message = 'Could not add dimension \\'' + dimensionName + '\\'. Metric has maximum 10 dimensions. ';
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
  const global = window;
  const csm = global.csm || {};
  global.csm = csm;

  csm.globalDimensions = []; // These dimensions are added to all captured metrics.
  csm.globalOptionalDimensions = [];
  csm.initFailureDimensions = [];

  const API = {
    getWorkflow: function(workflowType, instanceId, data) {
      return csm.workflow(workflowType, instanceId, data);
    },

    addMetric: function(metric) {
      csm.Util.assertExist(metric, 'metric');
      csm.putMetric(metric);
    },

    addMetricWithDedupe: function(metric, dedupeIntervalMs, context) {
      csm.Util.assertExist(metric, 'metric');
      csm.Util.assertExist(metric, 'dedupeIntervalMs');
      // context is optional; if present it will only dedupe on metrics with the same context. ex.) tabId
      metric.dedupeOptions = {dedupeIntervalMs, context: context || 'global'};
      csm.putMetric(metric);
    },

    addCount: function(metricName, count) {
      csm.Util.assertExist(metricName, 'metricName');
      csm.Util.assertExist(count, 'count');

      const metric = new csm.Metric(metricName, csm.UNIT.COUNT, count);
      csm.putMetric(metric);
    },

    addCountWithPageLocation: function(metricName) {
      csm.Util.assertExist(metricName, 'metricName');

      const metric = new csm.Metric(metricName, csm.UNIT.COUNT, 1.0);
      metric.addDimension('WindowLocation', csm.Util.pageLocationTransformer(window.location.pathname));
      csm.putMetric(metric);
    },

    addError: function(metricName, count) {
      csm.Util.assertExist(metricName, 'metricName');

      if (count === undefined || count == null) {
        count = 1.0;
      }
      const metric = new csm.Metric(metricName, csm.UNIT.COUNT, count);
      metric.addDimension('Metric', 'Error');
      csm.putMetric(metric);
    },

    addSuccess: function(metricName) {
      API.addError(metricName, 0);
    },

    addTime: function(metricName, time, unit) {
      csm.Util.assertExist(metricName, 'metricName');
      csm.Util.assertExist(time, 'time');

      let timeUnit = csm.UNIT.MILLISECONDS;
      if (unit && csm.Util.isValidTimeUnit(unit)) {
        timeUnit = unit;
      }
      const metric = new csm.Metric(metricName, timeUnit, time);
      metric.addDimension('Metric', 'Time');
      csm.putMetric(metric);
    },

    addTimeWithPageLocation: function(metricName, time, unit) {
      csm.Util.assertExist(metricName, 'metricName');
      csm.Util.assertExist(time, 'time');

      let timeUnit = csm.UNIT.MILLISECONDS;
      if (unit && csm.Util.isValidTimeUnit(unit)) {
        timeUnit = unit;
      }
      const metric = new csm.Metric(metricName, timeUnit, time);
      metric.addDimension('WindowLocation', csm.Util.pageLocationTransformer(window.location.pathname));
      csm.putMetric(metric);
    },

    pageReady: function() {
      if (window.performance && window.performance.now) {
        const pageLoadTime = window.performance.now();
        const metric = new csm.Metric('PageReadyLatency', csm.UNIT.MILLISECONDS, pageLoadTime);
        metric.addDimension('WindowLocation', csm.Util.pageLocationTransformer(window.location.pathname));
        csm.putMetric(metric);
      }
    },

    setPageLocationTransformer: function(transformFunc) {
      csm.Util.assertExist(transformFunc, 'transformFunc');
      csm.Util.assertTrue((typeof transformFunc) === 'function');
      csm.Util.pageLocationTransformer = transformFunc;
    },

    setGlobalDimensions: function(dimensions) {
      csm.Util.assertExist(dimensions, 'dimensions');
      csm.globalDimensions = dimensions;
    },

    setGlobalOptionalDimensions: function(dimensions) {
      csm.Util.assertExist(dimensions, 'dimensions');
      csm.globalOptionalDimensions = dimensions;
    },

    setInitFailureDimensions: function(dimensions) {
      csm.Util.assertExist(dimensions, 'dimensions');
      csm.initFailureDimensions = dimensions;
    },

    putCustom: function(endpoint, headers, data) {
      csm.Util.assertExist(data, 'data');
      csm.Util.assertExist(endpoint, 'endpoint');
      csm.Util.assertExist(headers, 'headers');
      csm.putCustom(endpoint, headers, data);
    },

    setAuthParams: function(authParams) {
      csm.setAuthParams(authParams);
    },

    setConfig: function(key, value) {
      csm.Util.assertExist(key, 'key');
      csm.Util.assertExist(value, 'value');
      if (!csm.configuration[key]) {
        csm.setConfig(key, value); // set configuration variables such as accountId, instanceId, userId
      }
    },
  };

  csm.API = API;
})();

(function() {
  const global = window;
  const csm = global.csm || {};
  global.csm = csm;

  const WORKFLOW_KEY_PREFIX = 'csm.workflow';

  /**
   * Calculates the local storage key used to store a workflow of the specified type.
   * @param {string} type of workflow
   * @return {string} storage key
   */
  const getWorkflowKeyForType = function(type) {
    return [
      WORKFLOW_KEY_PREFIX,
      type,
    ].join('.');
  };

  /**
   * Constructor for new Workflow objects.
   *
   * If you need to be able to share a workflow across tabs, it is recommended
   * to use "csm.workflow" to create/hydrate your workflows instead.
   * @param {string} type of workflow
   * @param {string} instanceId of workflow
   * @param {JSON} data blob associated with workflow
   */
  const Workflow = function(type, instanceId, data) {
    this.type = type;
    this.instanceId = instanceId || csm.Util.randomId();
    this.instanceSpecified = instanceId || false;
    this.eventMap = {};
    this.data = data || {};

    // Merge global dimensions into the data map.
    const dimensionData = {};
    csm.globalDimensions.forEach(function(dimension) {
      dimensionData[dimension.name] = dimension.value;
    });
    csm.globalOptionalDimensions.forEach(function(dimension) {
      dimensionData[dimension.name] = dimension.value;
    });
    this.data = this._mergeData(dimensionData);
  };

  /**
   * Create a new workflow or rehydrate an existing shared workflow.
   *
   * @param {string} type The type of workflow to be created.
   * @param {string} instanceId The instanceId of the workflow.  If not provided, it will be
   *      assigned a random ID and will not be automatically saved to local storage.
   *      If provided, we will attempt to load an existing workflow of the same type
   *      from local storage and rehydrate it.
   * @param {JSON} data An optional map of key/value pairs to be added as data to every
   *      workflow event created with this workflow.
   * @return {Workflow} workflow event
   * NOTE: Only one workflow of each type can be stored at the same time, to avoid
   *       overloading localStorage with unused workflow records.
   */
  csm.workflow = function(type, instanceId, data) {
    let workflow = new Workflow(type, instanceId, data);

    if (instanceId) {
      const savedWorkflow = csm._loadWorkflow(type);
      if (savedWorkflow && savedWorkflow.instanceId === instanceId) {
        workflow = savedWorkflow;
        workflow.addData(data || {});
      }
    }

    return workflow;
  };

  csm._loadWorkflow = function(type) {
    let workflow = null;
    const workflowJson = localStorage.getItem(getWorkflowKeyForType(type));
    const workflowStruct = workflowJson ? JSON.parse(workflowJson) : null;
    if (workflowStruct) {
      workflow = new Workflow(type, workflowStruct.instanceId);
      workflow.eventMap = workflowStruct.eventMap;
    }
    return workflow;
  };

  /**
   * Creates a new workflow event and returns it.  Then this workflow event is sent upstream
   * to the CSMSharedWorker where it is provided to the backend.
   *
   * If an instanceId was specified when the workflow was created, this will also save the workflow
   * and all of its events to localStorage.
   *
   * @param {string} event The name of the event that occurred.
   * @param {JSON} data An optional free-form key attribute pair of metadata items that will be stored
   *      and reported backstream with the workflow event.
   * @return {WorkflowEvent} workflowEvent
   */
  Workflow.prototype.event = function(event, data) {
    const mergedData = this._mergeData(data || {});
    const workflowEvent = new csm.WorkflowEvent({
      workflow: this,
      event: event,
      data: mergedData,
      userId: csm.configuration.userId || '',
      organizationId: csm.configuration.organizationId || '',
      accountId: csm.configuration.accountId || '',
      appName: csm.configuration.namespace || '',
    });
    csm.putWorkflowEvent(workflowEvent);
    this.eventMap[event] = workflowEvent;
    if (this.instanceSpecified) {
      this.save();
    }
    return workflowEvent;
  };

  /**
   * Creates a new workflow event and returns it, if the same event is not happened in ths past
   * dedupeIntervalMs milliseconds.
   * @param {string} event The name of the event that occurred.
   * @param {JSON} data An optional free-form key attribute pair of metadata items that will be stored
   * and reported backstream with the workflow event.
   * @param {int} dedupeIntervalMs defaults to 200 MS
   * @return {WorkflowEvent} workflowEvent
   */
  Workflow.prototype.eventWithDedupe = function(event, data, dedupeIntervalMs) {
    const pastEvent = this.getPastEvent(event);
    const now = new Date().getTime();
    const interval = dedupeIntervalMs || 200;

    // Crafting the expected workflow event data result
    const mergedData = this._mergeData(data);
    const expectedData = [];
    for (const key in mergedData) {
      if (Object.prototype.hasOwnProperty.call(mergedData, key)) {
        expectedData.push({'key': key, 'value': mergedData[key]});
      }
    }

    // Deduplicate same events that happened within interval
    if (!pastEvent || (pastEvent && JSON.stringify(pastEvent.data) !== JSON.stringify(expectedData)) ||
        (pastEvent && (now - pastEvent.timestamp > interval))) {
      return this.event(event, data);
    }
    return null;
  };

  /**
   * Get a past event if it exists in this workflow, otherwise returns null.
   * This can be helpful to emit metrics in real time based on the differences
   * between workflow event timestamps, especially for workflows shared across tabs.
   * @param {string} event key to see if workflow exists for this event
   * @return {WorkflowEvent} workflow event retrieved
   */
  Workflow.prototype.getPastEvent = function(event) {
    return event in this.eventMap ? this.eventMap[event] : null;
  };

  /**
   * Save the workflow to local storage. This only happens automatically when an
   * instanceId is specified on workflow creation, however if this method is called
   * explicitly by the client, the randomly generated workflow instance id can be
   * used to retrieve the workflow later and automatic save on events will be enabled.
   */
  Workflow.prototype.save = function() {
    this.instanceSpecified = true;
    localStorage.setItem(getWorkflowKeyForType(this.type), JSON.stringify(this));
  };

  /**
   * Remove this workflow if it is the saved instance for this workflow type in localStorage.
   */
  Workflow.prototype.close = function() {
    const storedWorkflow = csm._loadWorkflow(this.type);
    if (storedWorkflow && storedWorkflow.instanceId === this.instanceId) {
      localStorage.removeItem(getWorkflowKeyForType(this.type));
    }
  };

  Workflow.prototype.addData = function(data) {
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        this.data[key] = data[key];
      }
    }
  };

  Workflow.prototype._mergeData = function(data) {
    const mergedData = {};
    let key = null;
    for (key in this.data) {
      if (Object.prototype.hasOwnProperty.call(this.data, key)) {
        mergedData[key] = this.data[key] == null ? 'null' : (this.data[key] === '' ? ' ' : this.data[key].toString());
      }
    }
    for (key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        mergedData[key] = data[key] == null ? 'null' : (data[key] === '' ? ' ' : data[key].toString());
      }
    }
    return mergedData;
  };
})();

(function() {
  const global = window;
  const csm = global.csm || {};
  global.csm = csm;

  let worker = null;
  let portId = null;

  const MAX_INIT_MILLISECONDS = 5000;
  const preInitTaskQueue = [];
  csm.configuration = {};

  /**
   * Initialize CSM variables
   * @param {object} params for CSM
   * @params.namespace Define your metric namespace used in CloudWatch metrics
   * @params.sharedWorkerUrl Specify the relative url to the connect-csm-worker.js file in your service
   * @params.endpoint Specify an LDAS endpoint to use.
   * @params.dryRunMode When CSM is initialized with dry run mode, it won't actually publish metrics.
   * @params.defaultMetrics Enable default metrics. Default to false.
   */
  csm.initCSM = function(params) {
    csm.Util.assertExist(params.namespace, 'namespace');
    csm.Util.assertExist(params.sharedWorkerUrl, 'sharedWorkerUrl');
    csm.Util.assertExist(params.endpoint, 'endpoint');

    try {
      console.log('Starting csm shared worker with', params.sharedWorkerUrl);
      worker = new SharedWorker(params.sharedWorkerUrl, 'CSM_SharedWorker');
      worker.port.start();
    } catch (e) {
      console.log('Failed to initialize csm shared worker with', params.sharedWorkerUrl);
      console.log(e.message);
    }

    /**
     * Configure shared worker
     */
    csm.configuration = {
      namespace: params.namespace,
      userId: params.userId || '',
      accountId: params.accountId || '',
      organizationId: params.organizationId || '',
      endpointUrl: params.endpoint || null,
      batchSettings: params.batchSettings || null,
      addPageVisibilityDimension: params.addPageVisibilityDimension || false,
      addUrlDataDimensions: params.addUrlDataDimensions || false,
      dryRunMode: params.dryRunMode || false, // When csm is in dryRunMode it won't actually publish metrics to CSM
    };

    postEventToWorker(csm.EVENT_TYPE.CONFIG, csm.configuration);

    /**
     * Receive message from shared worker
     * @param {MessageEvent} messageEvent from shared worker
     */
    worker.port.onmessage = function(messageEvent) {
      const messageType = messageEvent.data.type;
      onMessageFromWorker(messageType, messageEvent.data);
    };

    /**
     * Inform shared worker window closed
     */
    global.onbeforeunload = function() {
      worker.port.postMessage(
          {
            type: csm.EVENT_TYPE.CLOSE,
            portId: portId,
          },
      );
    };

    /**
     * Check if initialization success
     */
    global.setTimeout(function() {
      if (!isCSMInitialized()) {
        console.log('[FATAL] CSM initialization failed! Please make sure the sharedWorkerUrl is reachable.');
      }
    }, MAX_INIT_MILLISECONDS);

    // Emit out of the box metrics
    if (params.defaultMetrics) {
      emitDefaultMetrics();
    }
  };
  // Final processing before sending to SharedWorker
  const processMetric = function(metric) {
    if (csm.configuration.addPageVisibilityDimension && document.visibilityState) {
      metric.addOptionalDimension('VisibilityState', document.visibilityState);
    }
  };

  const processWorkflowEvent = function(event) {
    if (csm.configuration.addUrlDataDimensions) {
      event.data.push({'key': 'ReferrerUrl', 'value': csm.Util.getReferrerUrl()});
      event.data.push({'key': 'Origin', 'value': csm.Util.getOrigin()});
      event.data.push({'key': 'WindowParent', 'value': csm.Util.getWindowParent()});
    }
    if (['initFailure', 'initializationLatencyInfo'].includes(event.event)) {
      csm.initFailureDimensions.forEach((dimension) => {
        Object.keys(dimension).forEach((key) => {
          event.data.push({'key': key, 'value': dimension[key]});
        });
      });
    }
    return event;
  };

  csm.putMetric = function(metric) {
    processMetric(metric);
    postEventToWorker(csm.EVENT_TYPE.METRIC, metric);
  };

  csm.putLog = function(log) {
    postEventToWorker(csm.EVENT_TYPE.LOG, log);
  };

  csm.putWorkflowEvent = function(event) {
    const processedEvent = processWorkflowEvent(event);
    postEventToWorker(csm.EVENT_TYPE.WORKFLOW_EVENT, processedEvent);
  };

  csm.putCustom = function(endpoint, headers, data) {
    postEventToWorker(csm.EVENT_TYPE.CUSTOM, data, endpoint, headers);
  };

  csm.setAuthParams = function(authParams) {
    postEventToWorker(csm.EVENT_TYPE.SET_AUTH, authParams);
  };

  csm.setConfig = function(key, value) {
    csm.configuration[key] = value;
    postEventToWorker(csm.EVENT_TYPE.SET_CONFIG, {key, value});
  };
  /** **********************  PRIVATE METHODS  ************************/

  const onMessageFromWorker = function(messageType, data) {
    if (messageType === csm.EVENT_TYPE.CONFIG) {
      portId = data.portId;
      onCSMInitialized();
    }
  };

  const onCSMInitialized = function() {
    // Purge the preInitTaskQueue
    preInitTaskQueue.forEach(function(task) {
      postEventToWorker(task.type, task.message, task.endpoint, task.headers);
    });

    // TODO:  Capture on errors and publish log to shared worker
    /**
            window.onerror = function(message, fileName, lineNumber, columnNumber, errorstack) {
                var log = new csm.Log(message, fileName, lineNumber, columnNumber, errorstack.stack);
                csm.putLog(log);
            };
        */
  };

  /**
   * Emit out of the box metrics automatically
   *
   * TODO allow configuration
   */
  const emitDefaultMetrics = function() {
    window.addEventListener('load', function() {
      // loadEventEnd is avaliable after the onload function finished
      // https://www.w3.org/TR/navigation-timing-2/#processing-model
      // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
      global.setTimeout(function() {
        try {
          const perfData = window.performance.getEntriesByType('navigation')[0];
          const pageLoadTime = perfData.loadEventEnd - perfData.startTime;
          const connectTime = perfData.responseEnd - perfData.requestStart;
          const domRenderTime = perfData.domComplete - perfData.domInteractive;
          csm.API.addCountWithPageLocation('PageLoad');
          csm.API.addTimeWithPageLocation('PageLoadTime', pageLoadTime);
          csm.API.addTimeWithPageLocation('ConnectTime', connectTime);
          csm.API.addTimeWithPageLocation('DomRenderTime', domRenderTime);
        } catch (err) {
          console.log('Error emitting default metrics', err);
        }
      }, 0);
    });
  };

  /**
   * Try posting message to shared worker
   * If shared worker hasn't been initialized, put the task to queue to be clean up once initialized
   * @param {csm.EVENT_TYPE} eventType for CSM
   * @param {object} message event following type of eventType
   * @param {string} [endpoint] optional parameter for putCustom function (put any data to specified endpoint)
   * @param {object} [headers] optional parameter for putCustom function
   */
  const postEventToWorker = function(eventType, message, endpoint, headers) {
    if (eventType === csm.EVENT_TYPE.CONFIG || isCSMInitialized()) {
      worker.port.postMessage(
          {
            type: eventType,
            portId: portId,
            message: message,
            endpoint: endpoint,
            headers: headers,
          },
      );
    } else {
      preInitTaskQueue.push({
        type: eventType,
        message: message,
        endpoint: endpoint,
        headers: headers,
      });
    }
  };

  const isCSMInitialized = function() {
    return portId !== null;
  };
})()`;
