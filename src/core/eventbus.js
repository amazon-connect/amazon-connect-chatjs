import Utils from "../utils";

const ALL_EVENTS = "<<all>>";

/**
 * An object representing an event subscription in an EventBus.
 */
var Subscription = function(subMap, eventName, f) {
    this.subMap = subMap;
    this.id = Utils.randomId();
    this.eventName = eventName;
    this.f = f;
};

/**
 * Unsubscribe the handler of this subscription from the EventBus
 * from which it was created.
 */
Subscription.prototype.unsubscribe = function() {
    this.subMap.unsubscribe(this.eventName, this.id);
};

/**
 * A map of event subscriptions, used by the EventBus.
 */
var SubscriptionMap = function() {
    this.subIdMap = {};
    this.subEventNameMap = {};
};

/**
 * Add a subscription for the named event.  Creates a new Subscription
 * object and returns it.  This object can be used to unsubscribe.
 */
SubscriptionMap.prototype.subscribe = function(eventName, f) {
    var sub = new Subscription(this, eventName, f);

    this.subIdMap[sub.id] = sub;
    var subList = this.subEventNameMap[eventName] || [];
    subList.push(sub);
    this.subEventNameMap[eventName] = subList;
    return () => sub.unsubscribe();
};

/**
 * Unsubscribe a subscription matching the given event name and id.
 */
SubscriptionMap.prototype.unsubscribe = function(eventName, subId) {
    if (Utils.contains(this.subEventNameMap, eventName)) {
        this.subEventNameMap[eventName] = this.subEventNameMap[eventName].filter(
            function(s) {
                return s.id !== subId;
            }
        );

        if (this.subEventNameMap[eventName].length < 1) {
            delete this.subEventNameMap[eventName];
        }
    }

    if (Utils.contains(this.subIdMap, subId)) {
        delete this.subIdMap[subId];
    }
};

/**
 * Get a list of all subscriptions in the subscription map.
 */
SubscriptionMap.prototype.getAllSubscriptions = function() {
    return Utils.values(this.subEventNameMap).reduce(function(a, b) {
        return a.concat(b);
    }, []);
};

/**
 * Get a list of subscriptions for the given event name, or an empty
 * list if there are no subscriptions.
 */
SubscriptionMap.prototype.getSubscriptions = function(eventName) {
    return this.subEventNameMap[eventName] || [];
};

/**
 * An object which maintains a map of subscriptions and serves as the
 * mechanism for triggering events to be handled by subscribers.
 * @type Class
 */
var EventBus = function(paramsIn) {
    var params = paramsIn || {};

    this.subMap = new SubscriptionMap();
    this.logEvents = params.logEvents || false;
};

/**
 * Subscribe to the named event.  Returns a new Subscription object
 * which can be used to unsubscribe.
 */
EventBus.prototype.subscribe = function(eventName, f) {
    Utils.assertNotNull(eventName, "eventName");
    Utils.assertNotNull(f, "f");
    Utils.assertTrue(Utils.isFunction(f), "f must be a function");
    return this.subMap.subscribe(eventName, f);
};

/**
 * Subscribe a function to be called on all events.
 */
EventBus.prototype.subscribeAll = function(f) {
    Utils.assertNotNull(f, "f");
    Utils.assertTrue(Utils.isFunction(f), "f must be a function");
    return this.subMap.subscribe(ALL_EVENTS, f);
};

/**
 * Get a list of subscriptions for the given event name, or an empty
 * list if there are no subscriptions.
 */
EventBus.prototype.getSubscriptions = function(eventName) {
    return this.subMap.getSubscriptions(eventName);
};

/**
 * Trigger the given event with the given data.  All methods subscribed
 * to this event will be called and are provided with the given arbitrary
 * data object and the name of the event, in that order.
 */
EventBus.prototype.trigger = function(eventName, data) {
    Utils.assertNotNull(eventName, "eventName");
    var self = this;
    var allEventSubs = this.subMap.getSubscriptions(ALL_EVENTS);
    var eventSubs = this.subMap.getSubscriptions(eventName);

    // if (this.logEvents && (eventName !== connect.EventType.LOG && eventName !== connect.EventType.MASTER_RESPONSE && eventName !== connect.EventType.API_METRIC)) {
    //    connect.getLog().trace("Publishing event: %s", eventName);
    // }

    allEventSubs.concat(eventSubs).forEach(function(sub) {
        try {
            sub.f(data || null, eventName, self);
        } catch (e) {
            //   connect
            //     .getLog()
            //     .error("'%s' event handler failed.", eventName)
            //     .withException(e);
        }
    });
};

/**
 * Trigger the given event with the given data.  All methods subscribed
 * to this event will be called and are provided with the given arbitrary
 * data object and the name of the event, in that order.
 */
EventBus.prototype.triggerAsync = function(eventName, data) {
    setTimeout(() => this.trigger(eventName, data), 0);
};

/**
 * Returns a closure which bridges an event from another EventBus to this bus.
 *
 * Usage:
 * conduit.onUpstream("MyEvent", bus.bridge());
 */
EventBus.prototype.bridge = function() {
    var self = this;
    return function(data, event) {
        self.trigger(event, data);
    };
};

/**
 * Unsubscribe all events in the event bus.
 */
EventBus.prototype.unsubscribeAll = function() {
    this.subMap.getAllSubscriptions().forEach(function(sub) {
        sub.unsubscribe();
    });
};

export { EventBus };
