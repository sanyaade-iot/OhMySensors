class NodeNetwork {
  constructor() {
    this.nodes = {};
  }

  addNode(node) {
    this.nodes[node.id] = node;

    $('body').append(`
      <div class="node" data-nodeid="${node.id}">
        <span class="node_name">${node.name}</span>
        <span class="node_version">${node.version}</span>
        <span class="node_battery">${node.battery}</span>
        <ul class="sensors">
        </ul>
      </div>
    `);
  }
}

class Node {
  constructor(options) {
    this.id = options.id;
    this.name = options.name || null;
    this.version = options.version || null;
    this.battery = options.battery || null;

    this.sensors = {};
  }

  updateName(name) {
    this.name = name;

    $(`.node[data-nodeid=${this.id}] .node_name`).text(this.name);
  }

  updateVersion(version) {
    this.version = version;

    $(`.node[data-nodeid=${this.id}] .node_version`).text(this.version);
  }

  updateBattery(battery) {
    this.battery = battery;

    $(`.node[data-nodeid=${this.id}] .node_battery`).text(this.battery);
  }

  addSensor(sensor) {
    this.sensors[sensor.childId] = sensor;

    $(`.node[data-nodeid=${this.id}] .sensors`).append(`
      <li class="sensor" data-sensorId="${sensor.id}" data-childId="${sensor.childId}">
        <span class="sensor_type">${sensor.type}</span>
        <span class="sensor_description">${sensor.description}</span>
        <span class="sensor_last_seen">${sensor.lastSeen}</span>

        <ul class="data">
        </ul>
      </li>
    `);
  }
}

class Sensor {
  constructor(options) {
    this.id = options.sensorId;
    this.childId = options.childId;
    this.type = options.type;
    this.description = options.description;
    this.variables = options.variables;
    this.lastSeen = options.lastSeen;

    this.data = {};
  }

  updateLastSeen(lastSeen) {
    this.lastSeen = lastSeen;

    $(`.node[data-nodeid=${this.id}] .sensor[data-childId=${this.childId}]`).text(lastSeen);
  }

  updateData(options) {
    this.data[options.type] = {
      value: options.value,
      receivedDate: options.receivedDate
    };

    var selector = `.node[data-nodeid=${this.id}] .sensor[data-childId=${this.childId}] .data`;

    if (!$(selector).length) {
      alert('non existent');
      $(selector).append(`
        <li class="variable" data-type="${options.type}">
          <span class="data_type">${options.type}</span>
          <span class="data_value">${options.value}</span>
          <span class="data_received_date">${options.receivedDate}</span>
        </li>
      `);
    } else {
      $(selector).find(`.variable[data-type=${options.type}] .data_value`).text(`${options.value}`);
      $(selector).find(`.variable[data-type=${options.type}] .data_received_date`).text(`${options.receivedDate}`);

    }
  }
}

window.NodeNetwork = NodeNetwork;
window.Node = Node;
window.Sensor = Sensor;