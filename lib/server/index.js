var denodeify = require('denodeify');
var logger = require('winston');
var SerialProtocol = require('../serial-protocol');
var RequestHandler = require('./request-handler');

module.exports = async function(options) {
  
  var db = options.db;
  var eventManager = options.eventManager;
  var gateway = options.gateway;
  var wss = options.wss;

  var P_dbGet = denodeify(db.data.get.bind(db.data));
  var P_dbRun = denodeify(db.data.run.bind(db.data));
  var P_dbAll = denodeify(db.data.all.bind(db.data));

  wss.broadcast = function (data) {
    wss.clients.forEach(function (client) {
      client.send(data);
    });
  };

  // Handle connections

  wss.on('connection', async function onConnection(ws) {

    var data = ['config', {
      units: db.config.units
    }];

    ws.send(JSON.stringify(data));
    // Send sensors state

    var nodes = await P_dbAll('SELECT * FROM nodes');

    nodes.forEach(function(node) {
      var data = ['nodeRegistered', {
        nodeId: node.id,
        name: node.sketch_name,
        version: node.sketch_version,
        battery: node.battery
      }];

      ws.send(JSON.stringify(data));
    });

    var sensors = await P_dbAll('SELECT * FROM sensors');
    sensors.forEach(function(sensor) {
      var data = ['sensorRegistered', {
        nodeId: sensor.node_id,
        childId: sensor.child_id,
        sensorId: sensor.id,
        type: sensor.type,
        description: sensor.description,
        variables: SerialProtocol.getAllVariableDetailsForSensor(sensor.type),
        lastSeen: new Date(sensor.lastSeen)
      }];

      ws.send(JSON.stringify(data));
    });

    var sensorsData = await P_dbAll('SELECT data.sensor_id, data.received_date, data.type, data.value, sensors.node_id, sensors.child_id FROM data INNER JOIN sensors ON data.sensor_id = sensors.id GROUP BY data.type, data.sensor_id'); // Get last value of each type for each node
    sensorsData.forEach(function(sensorData) {
      var data = ['dataReceived', {
        nodeId: sensorData.node_id,
        childId: sensorData.child_id,
        sensorId: sensorData.sensor_id,
        type: sensorData.type,
        value: sensorData.value,
        receivedDate: new Date(sensorData.received_date)
      }];

      ws.send(JSON.stringify(data));
    });

    // Handle received messages from the client

    ws.on('message', async function(message) {
      var message = JSON.parse(message);
      var action = message[0];
      var value = message[1];

      switch (action) {
        case 'actuate':
          var result = await P_dbGet('SELECT node_id, child_id, type FROM sensors WHERE id = ?', value.sensorId);
          var message = new SerialProtocol.Message({
            nodeId: result.node_id,
            childSensorId: result.child_id,
            messageType: 'set',
            ack: false,
            subType: value.type,
            value: value.value
          });

          if (!message.validate(result.type)) { // Can this sensor type receive this set?
            return;
          }

          await gateway.send(message.stringify());
          break;
        case 'request':
          await RequestHandler({ ws: ws, db: db }, {
            id: value.id,
            type: value.type,
            params: value.params
          });
          break;
        default:
          break;
      }
    });
  });


  // Broadcast events

  eventManager.onAny(function(value) {
    var eventName = this.event;
    var data = [eventName, value];

    wss.broadcast(JSON.stringify(data));
  });
};