var denodeify = require('denodeify');
var logger = require('winston');

module.exports = async function(db, eventManager, gateway, wss) {

  var P_dbRun = denodeify(db.data.run.bind(db.data));
  var P_dbAll = denodeify(db.data.all.bind(db.data));

  wss.broadcast = function (data) {
    wss.clients.forEach(function (client) {
      client.send(data);
    });
  };

  // Handle connections

  wss.on('connection', async function onConnection(ws) {
    // Send sensors state

    var nodes = await P_dbAll('SELECT * FROM nodes');

    nodes.forEach(function(node) {
      var data = ['node_registered', {
        nodeId: node.id,
        name: node.sketch_name,
        version: node.sketch_version,
        battery: node.battery
      }];

      ws.send(JSON.stringify(data));
    });

    var sensors = await P_dbAll('SELECT * FROM sensors');
    sensors.forEach(function(sensor) {
      var data = ['sensor_registered', {
        nodeId: sensor.node_id,
        childId: sensor.child_id,
        sensorId: sensor.id,
        type: sensor.type,
        description: sensor.description,
        lastSeen: sensor.lastSeen
      }];

      ws.send(JSON.stringify(data));
    });

    var sensorsData = await P_dbAll('SELECT data.sensor_id, data.received_date, data.type, data.value, sensors.node_id, sensors.child_id FROM data  INNER JOIN sensors ON data.sensor_id = sensors.id GROUP BY data.type, data.sensor_id'); // Get last value of each type for each node
    sensorsData.forEach(function(sensorData) {
      var data = ['data_received', {
        nodeId: sensorData.node_id,
        childId: sensorData.child_id,
        sensorId: sensorData.sensor_id,
        type: sensorData.type,
        value: sensorData.value
      }];

      ws.send(JSON.stringify(data));
    });

    ws.on('message', function(message) {
      var action = message[0];
      var value = message[1];

      // TODO: handle actions
    });
  });


  // Handle events

  eventManager.onAny(function(value) {
    var eventName = this.event;
    var data = [eventName, value];

    wss.broadcast(JSON.stringify(data));
  });
};