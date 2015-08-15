var SerialProtocol = require('./serial-protocol');
var logger = require('winston');

var Controller = function(db) {
  this.db = db;
};

Controller.prototype.handle = function(parsedMessage) {
  var toSend = '';
  if (parsedMessage.messageType === 'internal') {
    switch(parsedMessage.subType) {
      case 'I_BATTERY_LEVEL':
        // Battery level of the sensor
        break;
      case 'I_TIME':
        // Send back timestamp in seconds
        parsedMessage.payload = Math.floor(Date.now() / 1000);
        toSend = SerialProtocol.stringify(parsedMessage);
        break;
      case 'I_ID_REQUEST':
        // Send back unique sensor id with I_ID_RESPONSE
        break;
      case 'I_INCLUSION_MODE':
        // ?
        break;
      case 'I_CONFIG':
        // Send back with (M)etric or (I)mperial
        // TODO: implement config
        parsedMessage.payload = 'M';
        toSend = SerialProtocol.stringify(parsedMessage);
        break;
      case 'I_LOG_MESSAGE':
        // Log message from sensor
        break;
      case 'I_CHILDREN':
        // ?
        break;
      case 'I_SKETCH_NAME':
        // Sketch name
        break;
      case 'I_SKETCH_VERSION':
        // Sketch version
        break;
      case 'I_GATEWAY_READY':
        logger.info('Gateway is ready');
        break;
    }
  }
};

module.exports = Controller;