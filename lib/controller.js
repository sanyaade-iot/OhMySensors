var SerialProtocol = require('./serial-protocol');
var denodeify = require('denodeify');
var logger = require('winston');

var Controller = function(db, connector) {
  this.db = db;
  this.connector = connector;
};

Controller.prototype._send = function(parsed, cb) {
  logger.debug('Sending ' + JSON.stringify(parsed, null, 4));
  var message = SerialProtocol.stringify(parsed);
  this.connector.send(message, function onSent() {
    return cb();
  });
};

Controller.prototype._checkNodeExistence = function(nodeId, cb) {
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

Controller.prototype._checkSensorExistence = function(nodeId, childSensorId, cb) {
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

Controller.prototype.handle = async function(parsedMessage) {
  var self = this;

  var P_send = denodeify(this._send.bind(this));
  var P_checkNodeExistence = denodeify(this._checkNodeExistence.bind(this));
  var P_checkSensorExistence = denodeify(this._checkSensorExistence.bind(this));
  var P_dbRun = denodeify(this.db.data.run.bind(this.db.data));
  var P_dbGet = denodeify(this.db.data.get.bind(this.db.data));

  var toSend;

  var nodeExist = await P_checkNodeExistence(parsedMessage.nodeId);
  if (!nodeExist && parsedMessage.subType !== 'I_ID_REQUEST' && parsedMessage.subType !== 'I_GATEWAY_READY') {
    logger.info('Node not registered, ignoring the message');
    return;
  }

  if (parsedMessage.messageType === 'internal') {
    switch(parsedMessage.subType) {
      case 'I_BATTERY_LEVEL':
        // Battery level of the sensor
        logger.info(`Node #${parsedMessage.nodeId}: sent battery ${parsedMessage.payload}%`);
        await P_dbRun('UPDATE nodes SET battery = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
        break;
      case 'I_TIME':
        // Send back timestamp in seconds
        logger.info(`Node #${parsedMessage.nodeId}: requested time`);
        parsedMessage.payload = Math.floor(Date.now() / 1000);
        toSend = parsedMessage;
        break;
      case 'I_ID_REQUEST':
        // Send back ID with I_ID_RESPONSE
        logger.info(`Node #${parsedMessage.nodeId}: requested ID`);
        await P_dbRun('INSERT INTO nodes DEFAULT VALUES');
        parsedMessage.payload = db.lastID;
        parsedMessage.subType = 'I_ID_RESPONSE';
        toSend = parsedMessage;
        break;
      case 'I_INCLUSION_MODE':
        // ?
        break;
      case 'I_CONFIG':
        // Send back with (M)etric or (I)mperial
        // TODO: implement config
        logger.info(`Node #${parsedMessage.nodeId}: requested config`);
        parsedMessage.payload = 'M';
        toSend = parsedMessage;
        break;
      case 'I_LOG_MESSAGE':
        // Log message from sensor
        logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: logged #${parsedMessage.payload}`);
        break;
      case 'I_CHILDREN':
        // ?
        break;
      case 'I_SKETCH_NAME':
        // Sketch name
        logger.info(`Node #${parsedMessage.nodeId}: sent sketch name #${parsedMessage.payload}`);
        await P_dbRun('UPDATE nodes SET sketch_name = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
        break;
      case 'I_SKETCH_VERSION':
        // Sketch version
        logger.info(`Node #${parsedMessage.nodeId}: sent sketch version #${parsedMessage.payload}`);
        await P_dbRun('UPDATE nodes SET sketch_version = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
        break;
      case 'I_GATEWAY_READY':
        logger.info('Gateway is ready');
        break;
    }
  } else if (parsedMessage.messageType === 'presentation') {
    if (parsedMessage.childSensorId === 255) {
      logger.info('Special child ID 255, ignoring registering');
      return;
    }

    var sensorExist = await P_checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
    if (!sensorExist) {
      logger.info(`Node #${parsedMessage.nodeId}: presented sensor #${parsedMessage.childSensorId} of type ${parsedMessage.subType} with description ${parsedMessage.payload}`);
      await P_dbRun('INSERT INTO sensors (node_id, child_id, type, description) VALUES (?, ?, ?, ?)', parsedMessage.nodeId, parsedMessage.childSensorId, parsedMessage.subType, parsedMessage.payload);
      return;
    }
  } else if (parsedMessage.messageType === 'set') {
    var sensorExist = await P_checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
    if (!sensorExist) {
      logger.info('Sensor not registered, ignoring the message');
      return;
    }

    logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: sent ${parsedMessage.subType} = ${parsedMessage.payload}`);

    var result = await P_dbGet('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', parsedMessage.nodeId, parsedMessage.childSensorId);
    var sensorId = result.id;

    await P_dbRun('INSERT INTO data (sensor_id, received_date, type, value) VALUES (?, ?, ?, ?)', sensorId, new Date().toISOString(), parsedMessage.subType, parsedMessage.payload);
  } else if (parsedMessage.messageType === 'req') {
    var sensorExist = await P_checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
    if (!sensorExist) {
      logger.info('Sensor not registered, ignoring the message');
      return;
    }

    logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: requested ${parsedMessage.subType}`);

    var result = await P_dbGet('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', parsedMessage.nodeId, parsedMessage.childSensorId);
    var sensorId = result.id;

    result = await P_dbGet('SELECT value FROM data WHERE sensor_id = ? AND type = ? ORDER BY received_date DESC LIMIT 1', sensorId, parsedMessage.subType);

    if (!result) {
      logger.info('Nothing available in database');
    } else {
      parsedMessage.payload = result.value;
      toSend = parsedMessage;
    }
  }

  if (toSend) {
    await P_send(toSend);
  }
};

module.exports = Controller;