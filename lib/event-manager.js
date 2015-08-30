var EventEmitter2 = require('eventemitter2').EventEmitter2;

class EventManager extends EventEmitter2 {
  constructor() {
    super();
  }
};

module.exports = EventManager;