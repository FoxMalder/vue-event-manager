/*!
 * vue-event-manager v2.1.3
 * https://github.com/pagekit/vue-event-manager
 * Released under the MIT License.
 */

'use strict';

/**
 * Utility functions.
 */
var _config = {};
var assign = Object.assign || _assign;
var isArray = Array.isArray;
function Util (_ref) {
  var config = _ref.config;
  _config = config;
}
function log(message, color) {
  if (color === void 0) {
    color = '#41B883';
  }

  if (typeof console !== 'undefined' && _config.devtools) {
    console.log("%c vue-event-manager %c " + message + " ", 'color: #fff; background: #35495E; padding: 1px; border-radius: 3px 0 0 3px;', "color: #fff; background: " + color + "; padding: 1px; border-radius: 0 3px 3px 0;");
  }
}
function isObject(val) {
  return val !== null && typeof val === 'object';
}
function isUndefined(val) {
  return typeof val === 'undefined';
}
function forEach(collection, callback) {
  Object.keys(collection || {}).forEach(function (key) {
    return callback.call(null, collection[key], key);
  });
}
function array(array) {
  if (array === void 0) {
    array = [];
  }

  if (!array.findIndex) {
    array.findIndex = _findIndex;
  }

  return array;
}
/**
 * Object.assign() polyfill.
 */

function _assign(target) {
  for (var _len = arguments.length, sources = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    sources[_key - 1] = arguments[_key];
  }

  sources.forEach(function (source) {
    Object.keys(source || {}).forEach(function (key) {
      return target[key] = source[key];
    });
  });
  return target;
}
/**
 * Array.findIndex() polyfill.
 */


function _findIndex(predicate) {
  if (this == null) {
    throw new TypeError('"this" is null or not defined');
  }

  if (typeof predicate !== 'function') {
    throw new TypeError('predicate must be a function');
  }

  var o = Object(this);
  var len = o.length >>> 0;
  var thisArg = arguments[1];
  var k = 0;

  while (k < len) {
    var kValue = o[k];

    if (predicate.call(thisArg, kValue, k, o)) {
      return k;
    }

    k++;
  }

  return -1;
}

/**
 * Event manager class.
 */

var EventManager = /*#__PURE__*/function () {
  function EventManager() {
    this.log = null;
    this.listeners = {};
  }

  var _proto = EventManager.prototype;

  _proto.on = function on(event, callback, priority) {
    var _this = this;

    if (priority === void 0) {
      priority = 0;
    }

    var listeners = array(this.listeners[event]);
    var index = listeners.findIndex(function (listener) {
      return listener.priority < priority;
    });

    if (~index) {
      listeners.splice(index, 0, {
        callback: callback,
        priority: priority
      });
    } else {
      listeners.push({
        callback: callback,
        priority: priority
      });
    }

    this.listeners[event] = listeners;
    return function () {
      return _this.off(event, callback);
    };
  };

  _proto.off = function off(event, callback) {
    if (!callback) {
      delete this.listeners[event];
    }

    var listeners = this.listeners[event];

    if (listeners && callback) {
      var index = listeners.findIndex(function (listener) {
        return listener.callback === callback;
      });

      if (~index) {
        listeners.splice(index, 1);
      }
    }
  };

  _proto.trigger = function trigger(event, params, asynch) {
    if (params === void 0) {
      params = [];
    }

    if (asynch === void 0) {
      asynch = false;
    }

    var _event = new Event(event, params);

    var reject = function reject(result) {
      return Promise.reject(result);
    };

    var resolve = function resolve(result) {
      return !isUndefined(result) ? result : _event.result;
    };

    var reducer = function reducer(result, _ref) {
      var callback = _ref.callback;

      var next = function next(result) {
        if (!isUndefined(result)) {
          _event.result = result;
        }

        if (result === false) {
          _event.stopPropagation();
        }

        if (_event.isPropagationStopped()) {
          return _event.result;
        }

        return callback.apply(callback, [_event].concat(_event.params));
      };

      return asynch ? result.then(next, reject) : next(result);
    };

    if (this.log) {
      this.log.call(this, _event);
    }

    var listeners = (this.listeners[_event.name] || []).concat();
    var result = listeners.reduce(reducer, asynch ? Promise.resolve() : undefined);
    return asynch ? result.then(resolve, reject) : resolve(result);
  };

  return EventManager;
}();
var Event = /*#__PURE__*/function () {
  function Event(event, params) {
    if (!isObject(event)) {
      event = {
        name: event
      };
    }

    if (!isArray(params)) {
      params = [params];
    }

    assign(this, event, {
      params: params,
      result: undefined
    });
  }

  var _proto2 = Event.prototype;

  _proto2.stopPropagation = function stopPropagation() {
    this.stop = true;
  };

  _proto2.isPropagationStopped = function isPropagationStopped() {
    return this.stop === true;
  };

  return Event;
}();

/**
 * Plugin class.
 */
var Events = new EventManager();
var Plugin = {
  version: '2.1.3',
  install: function install(Vue, options) {
    if (options === void 0) {
      options = {};
    }

    if (this.installed) {
      return;
    }

    Util(Vue);
    log(this.version); // add global instance/methods

    Vue.prototype.$events = Vue.events = assign(Events, options);

    Vue.prototype.$trigger = function (event, params, asynch) {
      if (params === void 0) {
        params = [];
      }

      if (asynch === void 0) {
        asynch = false;
      }

      if (!isObject(event)) {
        event = {
          name: event,
          origin: this
        };
      }

      return Events.trigger(event, params, asynch);
    }; // add merge strategy for "events"


    Vue.config.optionMergeStrategies.events = mergeEvents; // add mixin to parse "events" from component options

    Vue.mixin({
      beforeCreate: initEvents
    });
  },
  EventManager: EventManager
};
function mergeEvents(parentVal, childVal) {
  if (!childVal) {
    return parentVal;
  }

  if (!parentVal) {
    return childVal;
  }

  var events = assign({}, parentVal);

  for (var event in childVal) {
    var parent = events[event];
    var child = childVal[event];

    if (parent && !isArray(parent)) {
      parent = [parent];
    }

    events[event] = parent ? parent.concat(child) : isArray(child) ? child : [child];
  }

  return events;
}
function initEvents() {
  var _this = this;

  var _events = [];
  var events = this.$options.events;

  if (events) {
    forEach(events, function (listeners, event) {
      forEach(isArray(listeners) ? listeners : [listeners], function (listener) {
        var priority = 0;

        if (isObject(listener)) {
          priority = listener.priority;
          listener = listener.handler;
        }

        _events.push(_this.$events.on(event, bindListener(listener, _this), priority));
      });
    });
    this.$on('hook:beforeDestroy', function () {
      return _events.forEach(function (off) {
        return off();
      });
    });
  }
}
function bindListener(fn, vm) {
  if (typeof fn === 'string') {
    return function () {
      return vm[fn].apply(vm, arguments);
    };
  }

  return fn.bind(vm);
}

/**
 * Install plugin.
 */

if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.use(Plugin);
}

module.exports = Plugin;
