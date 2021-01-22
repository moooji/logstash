require("isomorphic-fetch");

const { default: pQueue } = require("p-queue");
const pRetry = require("p-retry");

function create(url, tags, level, options) {
  return new Logstash(url, tags, level, options);
}

function Logstash(url, tags = [], level = "info", options = {}) {
  if (!url) {
    throw new TypeError("Invalid URL");
  }

  this.url = url;
  this.tags = tags;
  this.level = level;
  this.maxRetries = options.maxRetries || 5;
  this.concurrency = options.concurrency || 25;
  this.maxMessagesPerSecond = options.maxMessagesPerSecond || 10;
  this.muteConsole = options.muteConsole === true || false;

  this.queue = new pQueue({
    concurrency: this.concurrency,
    intervalCap: this.maxMessagesPerSecond,
    interval: 1000,
  });
}

Logstash.prototype._sendEvent = function _sendEvent(event) {
  return fetch(this.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
};

Logstash.prototype.log = function log(level, message, fields) {
  const event = { level, fields, message };

  event["@timestamp"] = new Date().toISOString();
  event["@tags"] = this.tags;

  // Navigator metadata
  if (typeof navigator !== "undefined") {
    event.navigator = {
      cookieEnabled: navigator.cookieEnabled,
      geoLocation: navigator.geolocation,
      language: navigator.language,
      languages: navigator.languages,
      online: navigator.onLine,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
    };
  }

  // Location metadata
  if (typeof location !== "undefined") {
    event.location = {
      search: location.search,
      pathname: location.pathname,
      hostname: location.hostname,
      protocol: location.protocol,
      port: location.port,
      hash: location.hash,
      href: location.href,
    };
  }

  // Add to queue
  this.queue.add(() =>
    pRetry(() => this._sendEvent(event), { retries: this.maxRetries }).catch(
      (err) => {
        console.warn(`Could not send message to Logstash - [${err.message}]`);
      }
    )
  );

  if (this.muteConsole) {
    return;
  }

  const fieldsStr = fields ? ` - ${JSON.stringify(fields)}` : "";

  switch (level) {
    case "error":
      console.error(`${message}${fieldsStr}`);
      break;
    case "warn":
      console.warn(`${message}${fieldsStr}`);
      break;
    default:
      console.info(`${message}${fieldsStr}`);
  }
};

Logstash.prototype.debug = function debug(message, fields) {
  this.log("debug", message, fields);
};

Logstash.prototype.info = function info(message, fields) {
  this.log("info", message, fields);
};

Logstash.prototype.warn = function warn(message, fields) {
  this.log("warn", message, fields);
};

Logstash.prototype.error = function error(err, fields) {
  if (err instanceof Error) {
    this.log("error", err.message, Object.assign({ stack: err.stack }, fields));
  } else {
    this.log("error", err, fields);
  }
};

module.exports = create;
