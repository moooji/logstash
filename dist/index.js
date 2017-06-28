'use strict';

var axios = require('axios');
var loggers = [];

// If we are in a browser
// catch window errors (uncaught exceptions)
if (typeof window !== 'undefined') {
  window.onerror = function onError(message, url, lineNo, columnNo, err) {
    var fields = {};

    if (err && err.stack) {
      fields.stack = err.stack;
    }

    loggers.forEach(function (log) {
      return log.error(message, fields);
    });
  };
}

module.exports.create = function create(options) {
  /**
   * Constructor
   */
  function Logstash(options) {
    this.url = options.url;
    this.tags = options.tags;
    this.level = options.level || 'info';
    this.sendDelay = options.sendDelay || 100;
    this.retryDelay = options.retryDelay || 2000;
    this.muteConsole = options.muteConsole === true || false;
    this.isSending = false;
    this.queue = [];
  }

  Logstash.prototype._trySendEvent = function _trySendEvent() {
    var _this = this;

    if (!this.queue.length || this.isSending) {
      return;
    }

    this.isSending = true;
    var event = this.queue.shift();

    var request = {
      url: this.url,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      data: event
    };

    // HTTP request
    axios(request).then(function () {
      _this.isSending = false;
      setTimeout(_this._trySendEvent.bind(_this), _this.sendDelay);
    }).catch(function () {
      // If we could not send the event,
      // put it back into queue
      _this.queue.unshift(event);

      _this.isSending = false;
      setTimeout(_this._trySendEvent.bind(_this), _this.retryDelay);
    });
  };

  Logstash.prototype.log = function log(level, message, fields) {
    var event = { level: level, fields: fields, message: message };

    event['@timestamp'] = new Date().toISOString();
    event['@tags'] = this.tags;

    // Navigator metadata
    if (typeof navigator !== 'undefined') {
      event.navigator = {
        cookieEnabled: navigator.cookieEnabled,
        geoLocation: navigator.geoLocation,
        language: navigator.language,
        languages: navigator.languages,
        online: navigator.online,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor
      };
    }

    // Location metadata
    if (typeof location !== 'undefined') {
      event.location = {
        search: location.search,
        pathname: location.pathname,
        hostname: location.hostname,
        protocol: location.protocol,
        port: location.port,
        hash: location.hash,
        href: location.href
      };
    }

    this.queue.push(event);
    this._trySendEvent();

    if (this.muteConsole) {
      return;
    }

    var fieldsStr = fields ? ' - ' + JSON.stringify(fields) : '';

    if (level === 'warn' || level === 'error') {
      console.error('' + message + fieldsStr);
    } else {
      console.info('' + message + fieldsStr);
    }
  };

  Logstash.prototype.debug = function debug(message, fields) {
    this.log('debug', message, fields);
  };

  Logstash.prototype.info = function info(message, fields) {
    this.log('info', message, fields);
  };

  Logstash.prototype.warn = function warn(message, fields) {
    this.log('warn', message, fields);
  };

  Logstash.prototype.error = function error(err, fields) {
    if (err instanceof Error) {
      this.log('error', err.message, Object.assign({ stack: err.stack }, fields));
    } else {
      this.log('error', err, fields);
    }
  };

  // Create logger instance
  var log = new Logstash(options);
  loggers.push(log);

  return log;
};