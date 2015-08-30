var SerialProtocol = require('./serial-protocol');
var denodeify = require('denodeify');
var logger = require('winston');

class Controller {
  constructor(options) {
    this._db = options.db;
    this._eventManager = options.eventManager;
    this._gateway = options.gateway;
  }

  async _send(parsedMessage) {
    logger.debug('Sending ' + JSON.stringify(parsed, null, 2));
    var message = parsedMessage.stringify();
    await this._gateway.send(message);
  }

  async _checkNodeExistence(nodeId) {
    var P_dbGet = denodeify(this._db.data.get.bind(this._db.data));
    var result = await P_dbGet('SELECT count(id) AS count FROM nodes WHERE id = ?', nodeId);
    if (result.count == 1) {
      return true;
    } else {
      return false;
    }
  }

  async _checkSensorExistence(nodeId, childSensorId) {
    var P_dbGet = denodeify(this._db.data.get.bind(this._db.data));
    var result = await P_dbGet('SELECT count(id) AS count FROM sensors WHERE node_id = ? AND child_id = ?', nodeId, childSensorId);
    if (result.count == 1) {
      return true;
    } else {
      return false;
    }
  }

  async _insertNodeAndGetId() {
    var self = this; // Needed, lastID bound to function context
    self.db.data.run('INSERT INTO nodes DEFAULT VALUES', function(err) {
      if(err) {
        reject(err);
      } else {
        return this.lastID;
      }
    });
  }

  async _insertSensorAndGetId(nodeId, childSensorId, subType, payload) {
    var self = this;
    self.db.data.run('INSERT INTO sensors (node_id, child_id, type, description, last_seen) VALUES (?, ?, ?, ?, ?)', nodeId, childSensorId, subType, payload, new Date().toISOString(), function(err) {
      if(err) {
        reject(err);
      } else {
        return this.lastID;
      }
    });
  }

  async _updateLastSeen(nodeId, childSensorId, sensorId = null) {
    var P_dbGet = denodeify(this._db.data.get.bind(this._db.data));
    var P_dbRun = denodeify(this._db.data.run.bind(this._db.data));

    var update = async (id) => {
      await P_dbRun('UPDATE sensors SET last_seen = ? WHERE id = ?', new Date().toISOString(), id);
      this._eventManager.emit('sensor_seen', {
        nodeId: nodeId,
        childId: childSensorId,
        sensorId: id
      });
    };

    if (!sensorId) {
      var result = await P_dbGet('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', nodeId, childSensorId);

      update(result.id);
    } else {
      update(sensorId);
    }
  }

  async handle(parsedMessage) {
    var P_dbRun = denodeify(this._db.data.run.bind(this._db.data));
    var P_dbGet = denodeify(this._db.data.get.bind(this._db.data));

    var toSend;

    var nodeExist = await this._checkNodeExistence(parsedMessage.nodeId);
    if (!nodeExist && parsedMessage.subType !== 'I_ID_REQUEST' && parsedMessage.subType !== 'I_GATEWAY_READY') {
      logger.info(`Node #${parsedMessage.nodeId}: not registered, ignoring the message`);
      return;
    }

    if (parsedMessage.messageType === 'internal') {
      switch(parsedMessage.subType) {
        case 'I_BATTERY_LEVEL':
          // Battery level of the sensor
          logger.info(`Node #${parsedMessage.nodeId}: sent battery ${parsedMessage.payload}%`);
          await P_dbRun('UPDATE nodes SET battery = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
          this._eventManager.emit('battery_level_updated', {
            nodeId: parsedMessage.nodeId,
            battery: parsedMessage.payload
          });
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
          var nodeId = await this._insertNodeAndGetId();
          parsedMessage.payload = nodeId;
          parsedMessage.subType = 'I_ID_RESPONSE';
          toSend = parsedMessage;
          this._eventManager.emit('node_registered', {
            nodeId: nodeId
          });
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
          // Log message from node
          logger.info(`Node #${parsedMessage.nodeId}: logged #${parsedMessage.payload}`);
          // TODO : store log?
          this._eventManager.emit('log_received', {
            nodeId: parsedMessage.nodeId,
            log: parsedMessage.payload
          });
          break;
        case 'I_CHILDREN':
          // ?
          break;
        case 'I_SKETCH_NAME':
          // Sketch name
          logger.info(`Node #${parsedMessage.nodeId}: sent sketch name ${parsedMessage.payload}`);
          await P_dbRun('UPDATE nodes SET sketch_name = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
          this._eventManager.emit('sketch_name_updated', {
            nodeId: parsedMessage.nodeId,
            name: parsedMessage.payload
          });
          break;
        case 'I_SKETCH_VERSION':
          // Sketch version
          logger.info(`Node #${parsedMessage.nodeId}: sent sketch version ${parsedMessage.payload}`);
          await P_dbRun('UPDATE nodes SET sketch_version = ? WHERE id = ?', parsedMessage.payload, parsedMessage.nodeId);
          this._eventManager.emit('sketch_version_updated', {
            nodeId: parsedMessage.nodeId,
            version: parsedMessage.payload
          });
          break;
        case 'I_GATEWAY_READY':
          logger.info('Gateway is ready');
          break;
      }
    } else if (parsedMessage.messageType === 'presentation') {
      if (parsedMessage.childSensorId === 255) {
        logger.info(`Node #${parsedMessage.nodeId}: special child ID 255, ignoring registering`);
        return;
      }

      var sensorExist = await this._checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
      if (!sensorExist) {
        logger.info(`Node #${parsedMessage.nodeId}: presented sensor #${parsedMessage.childSensorId} of type ${parsedMessage.subType} with description ${parsedMessage.payload}`);
        var sensorId = await this._insertSensorAndGetId(parsedMessage.nodeId, parsedMessage.childSensorId, parsedMessage.subType, parsedMessage.payload);
        this._eventManager.emit('sensor_registered', {
          nodeId: parsedMessage.nodeId,
          childId: parsedMessage.childSensorId,
          sensorId: sensorId,
          type: parsedMessage.subType,
          description: parsedMessage.payload
        });
        return;
      } else {
        await this._updateLastSeen(parsedMessage.nodeId, parsedMessage.childSensorId);
      }
    } else if (parsedMessage.messageType === 'set') {
      var sensorExist = await this._checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
      if (!sensorExist) {
        logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: not registered, ignoring the message`);
        return;
      }

      logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: sent ${parsedMessage.subType} = ${parsedMessage.payload}`);

      var result = await P_dbGet('SELECT id FROM sensors WHERE node_id = ? AND child_id = ?', parsedMessage.nodeId, parsedMessage.childSensorId);
      var sensorId = result.id;

      await P_dbRun('INSERT INTO data (sensor_id, received_date, type, value) VALUES (?, ?, ?, ?)', sensorId, new Date().toISOString(), parsedMessage.subType, parsedMessage.payload);
      this._eventManager.emit('data_received', {
        nodeId: parsedMessage.nodeId,
        childId: parsedMessage.childSensorId,
        sensorId: sensorId,
        type: parsedMessage.subType,
        value: parsedMessage.payload
      });
      await this._updateLastSeen(parsedMessage.nodeId, parsedMessage.childSensorId, sensorId);
    } else if (parsedMessage.messageType === 'req') {
      var sensorExist = await this._checkSensorExistence(parsedMessage.nodeId, parsedMessage.childSensorId);
      if (!sensorExist) {
        logger.info(`Node #${parsedMessage.nodeId} - Child ID #${parsedMessage.childSensorId}: not registered, ignoring the message`);
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
      await this._updateLastSeen(parsedMessage.nodeId, parsedMessage.childSensorId, sensorId);
    }

    if (toSend) {
      await this._send(toSend);
    }
  }
}

module.exports = Controller;