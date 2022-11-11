import { IllegalArgumentException } from "./core/exceptions";
import { ValueError } from "./core/exceptions";
import { sprintf } from "sprintf-js";
import { CONTENT_TYPE } from "./constants";
const Utils = {};

/**
 * Asserts that a premise is true.
 */
Utils.assertTrue = function(premise, message) {
    if (!premise) {
        throw new ValueError(message);
    }
};

/**
 * Asserts that a value is not null or undefined.
 */
Utils.assertNotNull = function(value, name) {
    Utils.assertTrue(
        value !== null && typeof value !== "undefined",
        sprintf("%s must be provided", name || "A value")
    );
    return value;
};

Utils.now = function() {
    return new Date().getTime();
};

Utils.isString = function(value) {
    return typeof value === "string";
};

/**
 * Generate a random ID consisting of the current timestamp
 * and a random base-36 number based on Math.random().
 */
Utils.randomId = function() {
    return sprintf(
        "%s-%s",
        Utils.now(),
        Math.random()
            .toString(36)
            .slice(2)
    );
};

Utils.assertIsNonEmptyString = function(value, key) {
    if (!value || typeof value !== "string") {
        throw new IllegalArgumentException(key + " is not a non-empty string!");
    }
};

Utils.assertIsList = function(value, key) {
    if (!Array.isArray(value)) {
        throw new IllegalArgumentException(key + " is not an array");
    }
};

Utils.assertIsEnum = function(value, allowedValues, key) {
    var i;
    for (i = 0; i < allowedValues.length; i++) {
        if (allowedValues[i] === value) {
            return;
        }
    }
    throw new IllegalArgumentException(
        key + " passed (" + value + ")" + " is not valid. Allowed values are: " + allowedValues
    );
};

/**
 * Generate an enum from the given list of lower-case enum values,
 * where the enum keys will be upper case.
 *
 * Conversion from pascal case based on code from here:
 * http://stackoverflow.com/questions/30521224
 */
Utils.makeEnum = function(values) {
    var enumObj = {};

    values.forEach(function(value) {
        var key = value
            .replace(/\.?([a-z]+)_?/g, function(x, y) {
                return y.toUpperCase() + "_";
            })
            .replace(/_$/, "");

        enumObj[key] = value;
    });

    return enumObj;
};

Utils.contains = function(obj, value) {
    if (obj instanceof Array) {
        return (
            Utils.find(obj, function(v) {
                return v === value;
            }) !== null
        );
    } else {
        return value in obj;
    }
};

Utils.find = function(array, predicate) {
    for (var x = 0; x < array.length; x++) {
        if (predicate(array[x])) {
            return array[x];
        }
    }

    return null;
};

Utils.containsValue = function(obj, value) {
    if (obj instanceof Array) {
        return (
            Utils.find(obj, function(v) {
                return v === value;
            }) !== null
        );
    } else {
        return (
            Utils.find(Utils.values(obj), function(v) {
                return v === value;
            }) !== null
        );
    }
};

/**
 * Determine if the given value is a callable function type.
 * Borrowed from Underscore.js.
 */
Utils.isFunction = function(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
};

/**
 * Get a list of values from a Javascript object used
 * as a hash map.
 */
Utils.values = function(map) {
    var values = [];

    Utils.assertNotNull(map, "map");

    for (var k in map) {
        values.push(map[k]);
    }

    return values;
};

Utils.isObject = function(value) {
    return !(typeof value !== "object" || value === null);
};

Utils.assertIsObject = function(value, key) {
    if (!Utils.isObject(value)) {
        throw new IllegalArgumentException(key + " is not an object!");
    }
};

Utils.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

Utils.asyncWhileInterval = function(f, predicate, interval, count=0, error=null) {
    const now = new Date();
    if (predicate(count)) {
        return f(count).catch((e) => {
            const delay = Math.max(0, interval - (new Date()).valueOf() + now.valueOf());
            return Utils
                .delay(delay)
                .then(() => Utils.asyncWhileInterval(f, predicate, interval, count + 1, e));
        });
    } else {
        return Promise.reject(error || new Error("async while aborted"));
    }
};

Utils.isAttachmentContentType = function(contentType){
    return contentType === CONTENT_TYPE.applicationPdf
    || contentType === CONTENT_TYPE.imageJpg
    || contentType === CONTENT_TYPE.imagePng
    || contentType === CONTENT_TYPE.applicationDoc
    || contentType === CONTENT_TYPE.applicationXls
    || contentType === CONTENT_TYPE.applicationPpt
    || contentType === CONTENT_TYPE.textCsv
    || contentType === CONTENT_TYPE.audioWav;
};

export default Utils;
