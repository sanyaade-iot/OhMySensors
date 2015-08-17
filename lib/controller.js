var SerialProtocol = require('./serial-protocol');
var logger = require('winston');

var Controller = function(db, connector) {
  this.db = db;
  this.connector = connector;
};

Controller.prototype.handle = function(parsedMessage) {
  var self = this;
  var toSend = undefined;
  if (parsedMessage.messageType === 'internal') {

    if (!this.checkNodeExistence(parsedMessage.nodeId) && parsedMessage.subType !== 'I_ID_REQUEST') {
      return;
    }

    switch(parsedMessage.subType) {
      case 'I_BATTERY_LEVEL':
        // Battery level of the sensor
        self.db.data.run('UPDATE nodes SET battery = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId, function(err) {
          if(err) { return; /* TODO */ }
        });
        break;
      case 'I_TIME':
        // Send back timestamp in seconds
        parsedMessage.payload = Math.floor(Date.now() / 1000);
        toSend = parsedMessage;
        break;
      case 'I_ID_REQUEST':
        // Send back ID with I_ID_RESPONSE
        self.db.data.run('INSERT INTO nodes DEFAULT VALUES', function(err) {
          if(err) { return; /* TODO */ }

          parsedMessage.payload = this.lastID;
          parsedMessage.subType = 'I_ID_RESPONSE';
          toSend = parsedMessage;
        });
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
        logger.debug('Log from node #' + parsedMessage.nodeId + ' - Sensor ID #' + parsedMessage.childSensorId + ': ' + parsedMessage.payload);
        break;
      case 'I_CHILDREN':
        // ?
        break;
      case 'I_SKETCH_NAME':
        // Sketch name
        self.db.data.run('UPDATE nodes SET sketch_name = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId, function(err) {
          if(err) { return; /* TODO */ }
        });
        break;
      case 'I_SKETCH_VERSION':
        // Sketch version
        self.db.data.run('UPDATE nodes SET sketch_version = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId, function(err) {
          if(err) { return; /* TODO */ }
        });
        break;
      case 'I_GATEWAY_READY':
        logger.info('Gateway is ready');
        break;
    }

    if (toSend) {
      var message = SerialProtocol.stringify(toSend);
      self.connector.send(message);
    }
  }
};

Controller.prototype.checkNodeExistence = function(nodeId, cb) {
  var self = this;
  self.db.data.get('SELECT count(id) FROM nodes WHERE id = ?', nodeId, function(err, count) {
    if(err) { cb(err, null); }

    if (count === 1) {
      return cb(null, true);
    } else {
      return cb(null, false);
    }
  });
};

module.exports = Controller;