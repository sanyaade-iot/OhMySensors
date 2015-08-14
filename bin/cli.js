var argv = require('yargs')
    .usage('Usage: $0 <command> [options]')
    .command('debug', 'Debug the Serial Protocol messages sent and received')
    .demand(1)
    .example('$0 debug --ip 192.168.0.10 --port 5003')
    .demand(['ip', 'port'])
    .argv;

var command = argv._[0];

var logger = require('winston');
logger.cli();
var Ethernet = require('../lib/connector/ethernet');
var SerialProtocol = require('../lib/serial-protocol');


if (command === 'debug') {
  var gateway = new Ethernet(argv.ip, argv.port);
  gateway.on('connection', function onConnection() {
    logger.info('Connected to gateway');
  });

  gateway.on('reconnection', function onReconnection() {
    logger.info('Reconnected to gateway');
  });

  gateway.on('disconnection', function onDisconnection() {
    logger.info('Disconnected from gateway');
  });

  gateway.on('message', function onMessage(message) {
    var parsed;
    try {
      parsed = SerialProtocol.parse(message);
    } catch(err) {
      logger.error('Received bad formatted message: ' + message);
    }
    logger.info('Node #' + parsed.nodeId + ' - Child sensor ID #' + parsed.childSensorId + ': [' + parsed.messageType + '] ' + parsed.subType + ' = ' + parsed.payload);
  });
}