var SerialProtocol = require('./serial-protocol');
var logger = require('winston');

var Controller = function(db, connector) {
  this.db = db;
  this.connector = connector;
};

Controller.prototype.handle = function(parsedMessage) {
  var self = this;

  this.checkNodeExistence(parsedMessage.nodeId, function(err, exist) {
    if (!exist && parsedMessage.subType !== 'I_ID_REQUEST' && parsedMessage.subType !== 'I_GATEWAY_READY') {
      logger.debug('Node not registered, ignoring the message');
      return;
    } else {
      if (parsedMessage.messageType === 'internal') {
        switch(parsedMessage.subType) {
          case 'I_BATTERY_LEVEL':
            // Battery level of the sensor
            self.db.data.run('UPDATE nodes SET battery = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId, function(err) {
              if(err) { return; /* TODO */ }
              logger.debug('Node #' + parsedMessage.nodeId + ': battery updated to ' + parsedMessage.payload + '%');
            });
            break;
          case 'I_TIME':
            // Send back timestamp in seconds
            Logger.debug('Node #' + parsedMessage.nodeId + ': sent time');
            parsedMessage.payload = Math.floor(Date.now() / 1000);
            return send(parsedMessage, self);
            break;
          case 'I_ID_REQUEST':
            // Send back ID with I_ID_RESPONSE
            self.db.data.run('INSERT INTO nodes DEFAULT VALUES', function(err) {
              if(err) { return; /* TODO */ }

              logger.debug('Node #' + parsedMessage.nodeId + ': sent new ID');
              parsedMessage.payload = this.lastID;
              parsedMessage.subType = 'I_ID_RESPONSE';
              return send(parsedMessage, self);
            });
            break;
          case 'I_INCLUSION_MODE':
            // ?
            break;
          case 'I_CONFIG':
            // Send back with (M)etric or (I)mperial
            // TODO: implement config
            logger.debug('Node #' + parsedMessage.nodeId + ': sent metric/imperial config');
            parsedMessage.payload = 'M';
            return send(parsedMessage, self);
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
              logger.debug('Node #' + parsedMessage.nodeId + ': sketch name updated to ' + parsedMessage.payload);
            });
            break;
          case 'I_SKETCH_VERSION':
            // Sketch version
            self.db.data.run('UPDATE nodes SET sketch_version = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId, function(err) {
              if(err) { return; /* TODO */ }
              logger.debug('Node #' + parsedMessage.nodeId + ': sketch version updated to ' + parsedMessage.payload);
            });
            break;
          case 'I_GATEWAY_READY':
            logger.info('Gateway is ready');
            break;
        }
      } else if (parsedMessage.messageType === 'presentation') {
        if (parsedMessage.childSensorId === 255) {
          logger.debug('Special child ID 255, ignoring registering')
          return;
        }
        self.checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId, function(err, exist) {
          if (!exist) {
            self.db.data.run('INSERT INTO sensors (node_id, child_id, type, description) VALUES (?, ?, ?, ?)', parsedMessage.nodeId, parsedMessage.childSensorId, parsedMessage.subType, parsedMessage.payload, function(err) {
              if(err) { return; /* TODO */ }
              logger.debug('Node #' + parsedMessage.nodeId + ': presented sensor ' + parsedMessage.childSensorId + ' of type ' + parsedMessage.subType + ' with description' + parsedMessage.payload);
            });
          }
        });
      } else if (parsedMessage.messageType === 'set') {
        self.checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId, function(err, exist) {
          if (!exist) {
            logger.debug('Sensor not registered, ignoring the message');
            return;
          }

          self.db.data.get('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', parsedMessage.nodeId, parsedMessage.childSensorId, function(err, result) {
            if(err) { return; /* TODO */ }
            var sensorId = result.id;

            self.db.data.run('INSERT INTO data (sensor_id, received_date, type, value) VALUES (?, ?, ?, ?)', sensorId, new Date().toISOString(), parsedMessage.subType, parsedMessage.payload, function(err) {
              if(err) { return; /* TODO */ }
              logger.debug('Sensor node #' + parsedMessage.nodeId + ' - Child #' + parsedMessage.childSensorId + ': sets ' + parsedMessage.subType + ' = ' + parsedMessage.payload);
            });
          });
        });
      } else if (parsedMessage.messageType === 'req') {
        self.checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId, function(err, exist) {
          if (!exist) {
            logger.debug('Sensor not registered, ignoring the message');
            return;
          }

          self.db.data.get('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', parsedMessage.nodeId, parsedMessage.childSensorId, function(err, result) {
            if(err) { return; /* TODO */ }
            var sensorId = result.id;

            self.db.data.get('SELECT value FROM data WHERE sensor_id = ? AND type = ? ORDER BY received_date DESC LIMIT 1', sensorId, parsedMessage.subType, function(err, result) {
              if(err) { return; /* TODO */ }

              logger.debug('Sensor node #' + parsedMessage.nodeId + ' - Child #' + parsedMessage.childSensorId + ' requested ' + parsedMessage.subType);

              if (!result) {
                logger.debug('Nothing available in database');
              } else {
                parsedMessage.payload = result.value;
                return send(parsedMessage, self);
              }
            });
          });
        });
      }
    }
  });

};

var send = function(parsed, context) {
  logger.debug('Sending ' + JSON.stringify(parsed, null, 4));
  var message = SerialProtocol.stringify(parsed);
  context.connector.send(message);
};

Controller.prototype.checkNodeExistence = function(nodeId, cb) {
  var self = this;
  self.db.data.get('SELECT count(id) AS count FROM nodes WHERE id = ?', nodeId, function(err, result) {
    if(err) { cb(err, null); }

    if (result.count === 1) {
      return cb(null, true);
    } else {
      return cb(null, false);
    }
  });
};

Controller.prototype.checkSensorExistence = function(nodeId, childSensorId, cb) {
  var self = this;
  self.db.data.get('SELECT count(id) AS count FROM sensors WHERE node_id = ? AND child_id = ?', nodeId, childSensorId, function(err, result) {
    if(err) { cb(err, null); }

    if (result.count === 1) {
      return cb(null, true);
    } else {
      return cb(null, false);
    }
  });
};

module.exports = Controller;