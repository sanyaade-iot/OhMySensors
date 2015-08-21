var EventEmitter = require('events').EventEmitter;

var EventManager = function() {
  var self = this;
  EventEmitter.call(this);
};
require('util').inherits(EventManager, EventEmitter);

module.exports = EventManager;