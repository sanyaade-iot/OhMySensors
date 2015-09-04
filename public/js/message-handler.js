var nodeNetwork = new NodeNetwork();
var units;

var MessageHandler = function(message) {
  var object = JSON.parse(message.data);
  var name = object[0];
  var value = object[1];

  switch(name) {
    case 'config':
      units = value.units;
      break;
    case 'nodeRegistered':
      var node = new Node({
        id: value.nodeId,
        name: value.name,
        version: value.version,
        battery: value.battery
      });
      nodeNetwork.addNode(node);
      break;
    case 'batteryLevelUpdated':
      nodeNetwork.nodes[value.nodeId].updateBattery(value.battery);
      break;
    case 'sketchNameUpdated':
      nodeNetwork.nodes[value.nodeId].updateName(value.name);
      break;
    case 'sketchVersionUpdated':
      nodeNetwork.nodes[value.nodeId].updateVersion(value.version);
      break;
    case 'sensorRegistered':
      var sensor = new Sensor({
        id: value.sensorId,
        childId: value.childId,
        type: value.type,
        description: value.description,
        variables: value.variables,
        lastSeen: new Date(value.lastSeen)
      });
      nodeNetwork.nodes[value.nodeId].addSensor(sensor);
      break;
    case 'sensorSeen':
      nodeNetwork.nodes[value.nodeId].sensors[value.childId].updateLastSeen(new Date());
      break;
    case 'dataReceived':
      nodeNetwork.nodes[value.nodeId].sensors[value.childId].updateData({ 
        type: value.type,
        value: value.value,
        receivedDate: new Date(value.receivedDate)
      });
      break;
  }
};

window.MessageHandler = MessageHandler;