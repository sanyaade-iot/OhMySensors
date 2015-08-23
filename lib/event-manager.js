var EventEmitter2 = require('eventemitter2').EventEmitter2;

var EventManager = function() {
  var self = this;
  EventEmitter2.call(this);
};
require('util').inherits(EventManager, EventEmitter2);

module.exports = EventManager;