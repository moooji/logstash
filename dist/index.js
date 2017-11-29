"use strict";

var axios = require('axios');
var loggers = [];

function create(url, tags, level) {
  return new Logstash(url, tags, level);
}

function Logstash(url) {
  var tags = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "info";
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  if (!url) {
    throw new TypeError("Invalid URL");
  }

  this.url = url;
  this.tags = tags;
  this.level = level;
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
  return axios(request).then(function () {
    _this.isSending = false;
    _this._trySendEvent();
  }).catch(function (err) {
    console.error(err);

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

  var fieldsStr = fields ? " - " + JSON.stringify(fields) : '';

  switch (level) {
    case "error":
      console.error("" + message + fieldsStr);
      break;
    case "warn":
      console.warn("" + message + fieldsStr);
      break;
    default:
      console.info("" + message + fieldsStr);
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

module.exports = create;