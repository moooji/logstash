const axios = require('axios');

function create(options) {
  return new Logstash(options);
}

function Logstash(options) {
  this.url = options.url;
  this.name = options.name;
  this.level = options.level || 'info';
  this.sendDelay = options.sendDelay || 100;
  this.retryDelay = options.retryDelay || 2000;
  this.isSending = false;
  this.queue = [];
}

Logstash.prototype.log = function log(level, message, fields) {
  const event = {
    level,
    message,
    fields
  };

  this.queue.push(event);
  this._trySendMessage();
}

Logstash.prototype.debug = function debug(message, fields) {
  this.log('debug', message, fields);
}

Logstash.prototype.info = function info(message, fields) {
  this.log('info', message, fields);
}

Logstash.prototype.warn = function warn(message, fields) {
  this.log('warn', message, fields);
}

Logstash.prototype.error = function error(message, fields) {
  this.log('error', message, fields);
}

Logstash._trySendEvent = function _trySendEvent() {
  if (!this.queue.length || this.isSending) {
    return;
  }
  
  this.isSending = true;
  const event = queue.shift();
  console.log(event);

  axios.post(this.url, event)
    .then(() => {
      this.isSending = false
      setTimeout(this._trySendEvent.bind(this), this.sendDelay);
    })
    .catch(() => {
      // If we could not send the event,
      // put it back into queue
      this.queue.unshift(event);

      this.isSending = false;
      setTimeout(this._trySendEvent.bind(this), this.retryDelay);
    });
}

module.exports.create = create;
